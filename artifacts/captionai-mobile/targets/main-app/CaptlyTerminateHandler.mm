//
// CaptlyTerminateHandler.mm
//
// Installs a std::terminate handler that captures the underlying NSException
// or C++ exception details BEFORE the process aborts. React Native's
// RCTTurboModule converts thrown ObjC NSExceptions into C++ exceptions, which
// then call std::terminate when no C++ catch handler exists in the dispatch
// block frame. NSSetUncaughtExceptionHandler does NOT fire on this path —
// only std::set_terminate does.
//
// On crash, this handler:
//   1. Logs full diagnostic info to NSLog (visible in Xcode console / sysdiagnose)
//   2. Writes the same info to Documents/captly-last-exception.txt so it can
//      be retrieved via the Files app (requires UIFileSharingEnabled)
//   3. Calls std::abort to terminate (preserving normal crash reporting)
//

#import <Foundation/Foundation.h>
#include <exception>
#include <cxxabi.h>
#include <typeinfo>

static std::terminate_handler g_previous_terminate_handler = nullptr;

static NSString *captly_describe_current_exception(void) {
  std::exception_ptr eptr = std::current_exception();
  if (!eptr) return @"<no current exception>";

  // First try: catch as ObjC NSException
  @try {
    std::rethrow_exception(eptr);
  } @catch (NSException *exc) {
    NSString *symbols = [[exc callStackSymbols] componentsJoinedByString:@"\n"];
    return [NSString stringWithFormat:
            @"NSException\n  name: %@\n  reason: %@\n  userInfo: %@\n  callStackSymbols:\n%@",
            exc.name,
            exc.reason ?: @"<nil>",
            exc.userInfo ?: @{},
            symbols ?: @"<none>"];
  } @catch (id obj) {
    return [NSString stringWithFormat:@"ObjC threw non-NSException: %@", obj];
  } @catch (...) {
    // fall through to C++ catch below
  }

  // Second try: catch as C++ exception
  try {
    std::rethrow_exception(eptr);
  } catch (const std::exception &e) {
    int status = 0;
    char *demangled = abi::__cxa_demangle(typeid(e).name(), nullptr, nullptr, &status);
    NSString *typeName = [NSString stringWithUTF8String:(demangled ? demangled : typeid(e).name())];
    if (demangled) free(demangled);
    NSString *what = [NSString stringWithUTF8String:(e.what() ?: "<no what()>")];
    return [NSString stringWithFormat:@"C++ exception\n  type: %@\n  what: %@", typeName, what];
  } catch (...) {
    return @"Unknown C++ exception (not derived from std::exception)";
  }
}

static void captly_terminate_handler(void) {
  NSString *diag = captly_describe_current_exception();
  NSString *thread = [NSThread isMainThread] ? @"main" : ([[NSThread currentThread] name] ?: @"<unnamed>");
  NSString *payload = [NSString stringWithFormat:
                       @"====== CAPTLY TERMINATE ======\nthread: %@\nutcTimestamp: %@\n%@\n==============================",
                       thread,
                       [[NSDate date] description],
                       diag];

  NSLog(@"%@", payload);

  // Write to Documents/captly-last-exception.txt — accessible via Files app
  // when UIFileSharingEnabled is YES in Info.plist.
  NSURL *docs = [[[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory
                                                        inDomains:NSUserDomainMask] firstObject];
  if (docs) {
    NSURL *url = [docs URLByAppendingPathComponent:@"captly-last-exception.txt"];
    NSData *data = [payload dataUsingEncoding:NSUTF8StringEncoding];
    [data writeToURL:url atomically:YES];
  }

  // Re-raise as an NSException so Apple's crash reporter records it under
  // "Last Exception Backtrace" in the .ips crash log. We only do this if the
  // current exception was NOT already an NSException (otherwise infinite loop).
  std::exception_ptr eptr = std::current_exception();
  bool wasNSException = false;
  if (eptr) {
    @try {
      std::rethrow_exception(eptr);
    } @catch (NSException *) {
      wasNSException = true;
    } @catch (...) {
      // not an NSException, safe to re-raise
    }
  }
  if (!wasNSException) {
    @try {
      [[NSException exceptionWithName:@"CaptlyTerminateDiagnostic"
                               reason:diag
                             userInfo:nil] raise];
    } @catch (...) {
      // ignore — fall through to abort
    }
  }

  if (g_previous_terminate_handler) g_previous_terminate_handler();
  std::abort();
}

@interface CaptlyTerminateInstaller : NSObject
@end

@implementation CaptlyTerminateInstaller
+ (void)load {
  g_previous_terminate_handler = std::set_terminate(captly_terminate_handler);
}
@end
