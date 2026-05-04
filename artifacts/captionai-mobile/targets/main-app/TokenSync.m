#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TokenSync, NSObject)
RCT_EXTERN_METHOD(setToken:(NSString *)token)
RCT_EXTERN_METHOD(clearToken)
RCT_EXTERN_METHOD(setNiche:(NSString *)niche)
@end
