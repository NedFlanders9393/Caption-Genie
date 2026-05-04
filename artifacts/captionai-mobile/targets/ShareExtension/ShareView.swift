import SwiftUI

// MARK: – Brand colours
private extension Color {
  static let captlyBg       = Color(red: 1.00,  green: 0.992, blue: 0.976) // #FFFDF9
  static let captlyAmber    = Color(red: 0.910, green: 0.714, blue: 0.412) // #E8B669
  static let captlyDark     = Color(red: 0.227, green: 0.192, blue: 0.161) // #3A3129
  static let captlyMuted    = Color(red: 0.549, green: 0.471, blue: 0.408) // #8C7869
  static let captlyBorder   = Color(red: 0.941, green: 0.890, blue: 0.831) // #F0E3D3
  static let captlyTileBg   = Color(red: 0.973, green: 0.937, blue: 0.894) // #F8EFE4
}

// MARK: – Root view
struct ShareView: View {
  let detectedPlatform: String
  let openURL: (URL) -> Void
  let onComplete: () -> Void

  @State private var description    = ""
  @State private var selectedTone   = "Casual"
  @State private var selectedPlatform: String

  @State private var isGenerating   = false
  @State private var generatedCaption: String?
  @State private var generatedHashtags: String?
  @State private var errorMessage: String?
  @State private var isCopied       = false

  @FocusState private var descFocused: Bool

  private let tones     = ["Casual", "Professional", "Funny", "Inspirational", "Bold"]
  private let platforms = ["Instagram", "TikTok", "Facebook", "LinkedIn", "Twitter/X"]

  init(detectedPlatform: String, openURL: @escaping (URL) -> Void, onComplete: @escaping () -> Void) {
    self.detectedPlatform  = detectedPlatform
    self.openURL           = openURL
    self.onComplete        = onComplete
    _selectedPlatform      = State(initialValue: detectedPlatform)
  }

  var body: some View {
    VStack(spacing: 0) {
      // Drag handle
      Capsule()
        .fill(Color.captlyBorder)
        .frame(width: 36, height: 4)
        .padding(.top, 10)
        .padding(.bottom, 4)

      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          headerRow
          if generatedCaption != nil {
            resultSection
          } else {
            inputSection
          }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 36)
      }
      .scrollDismissesKeyboard(.immediately)
    }
    .background(Color.captlyBg)
    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    .ignoresSafeArea(edges: .bottom)
  }

  // MARK: – Header
  private var headerRow: some View {
    HStack(spacing: 0) {
      HStack(spacing: 8) {
        ZStack {
          Circle()
            .fill(Color.captlyAmber)
            .frame(width: 32, height: 32)
            .shadow(color: Color.captlyAmber.opacity(0.45), radius: 5, y: 2)
          Image(systemName: "bolt.fill")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.white)
        }
        Text("Captly")
          .font(.system(size: 18, weight: .bold))
          .foregroundColor(Color.captlyDark)
      }
      Spacer()
      Button(action: onComplete) {
        Image(systemName: "xmark.circle.fill")
          .font(.system(size: 26))
          .foregroundColor(Color.captlyBorder)
      }
    }
    .padding(.top, 14)
  }

  // MARK: – Input form
  private var inputSection: some View {
    VStack(alignment: .leading, spacing: 18) {

      // Platform chips
      chipSection(label: "Platform", items: platforms, selected: $selectedPlatform)

      // Description
      VStack(alignment: .leading, spacing: 8) {
        sectionLabel("What's this post about?")
        ZStack(alignment: .topLeading) {
          TextEditor(text: $description)
            .font(.system(size: 15))
            .foregroundColor(Color.captlyDark)
            .frame(height: 90)
            .padding(10)
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
              RoundedRectangle(cornerRadius: 12)
                .strokeBorder(descFocused ? Color.captlyAmber : Color.captlyBorder, lineWidth: 1.2)
            )
            .focused($descFocused)

          if description.isEmpty {
            Text("e.g. New product launch, summer sale, behind the scenes…")
              .font(.system(size: 14))
              .foregroundColor(Color.captlyBorder)
              .padding(.leading, 14)
              .padding(.top, 18)
              .allowsHitTesting(false)
          }
        }
      }

      // Tone chips
      chipSection(label: "Tone", items: tones, selected: $selectedTone)

      // Auth warning / error
      if let err = errorMessage {
        errorBanner(err)
      }

      // Generate button
      generateButton
    }
  }

  // MARK: – Result section
  private var resultSection: some View {
    VStack(alignment: .leading, spacing: 14) {

      // Caption card
      VStack(alignment: .leading, spacing: 10) {
        HStack {
          Label(selectedPlatform, systemImage: "checkmark.circle.fill")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(Color.captlyAmber)
          Spacer()
          Button {
            generatedCaption  = nil
            generatedHashtags = nil
            errorMessage      = nil
            isCopied          = false
          } label: {
            Text("Try again")
              .font(.system(size: 12, weight: .medium))
              .foregroundColor(Color.captlyMuted)
          }
        }

        Text(generatedCaption ?? "")
          .font(.system(size: 14))
          .foregroundColor(Color.captlyDark)
          .lineSpacing(4)
          .fixedSize(horizontal: false, vertical: true)

        if let tags = generatedHashtags, !tags.isEmpty {
          Text(tags)
            .font(.system(size: 12))
            .foregroundColor(Color.captlyMuted)
            .lineSpacing(3)
        }
      }
      .padding(16)
      .background(Color.white)
      .cornerRadius(16)
      .overlay(
        RoundedRectangle(cornerRadius: 16)
          .strokeBorder(Color.captlyBorder, lineWidth: 1)
      )

      // Copy button
      Button(action: copyAll) {
        HStack(spacing: 8) {
          Image(systemName: isCopied ? "checkmark" : "doc.on.doc")
            .font(.system(size: 15, weight: .semibold))
          Text(isCopied ? "Copied! Go paste it ✌️" : "Copy Caption + Hashtags")
            .font(.system(size: 16, weight: .bold))
        }
        .foregroundColor(isCopied ? Color.captlyMuted : Color.captlyDark)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .background(
          RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(isCopied ? Color.captlyTileBg : Color.captlyAmber)
        )
      }

      if isCopied {
        Button(action: onComplete) {
          Text("Done — go paste it!")
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(Color.captlyMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
              RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Color.captlyBorder, lineWidth: 1.2)
            )
        }
      }
    }
  }

  // MARK: – Sub-views
  private func chipSection(label: String, items: [String], selected: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      sectionLabel(label)
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          ForEach(items, id: \.self) { item in
            Button { selected.wrappedValue = item } label: {
              Text(item)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(selected.wrappedValue == item ? .white : Color.captlyMuted)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                  Capsule()
                    .fill(selected.wrappedValue == item ? Color.captlyDark : Color.clear)
                )
                .overlay(
                  Capsule()
                    .strokeBorder(
                      selected.wrappedValue == item ? Color.captlyDark : Color.captlyBorder,
                      lineWidth: 1.2
                    )
                )
            }
          }
        }
        .padding(.vertical, 2)
      }
    }
  }

  private var generateButton: some View {
    let ready = !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    return Button(action: generate) {
      HStack(spacing: 8) {
        if isGenerating {
          ProgressView()
            .progressViewStyle(CircularProgressViewStyle(tint: Color.captlyDark))
            .scaleEffect(0.8)
          Text("Writing your caption…")
        } else {
          Image(systemName: "bolt.fill")
          Text("Generate Caption")
        }
      }
      .font(.system(size: 16, weight: .bold))
      .foregroundColor(Color.captlyDark)
      .frame(maxWidth: .infinity)
      .padding(.vertical, 16)
      .background(
        RoundedRectangle(cornerRadius: 14, style: .continuous)
          .fill(ready ? Color.captlyAmber : Color.captlyBorder)
      )
    }
    .disabled(!ready || isGenerating)
  }

  private func sectionLabel(_ text: String) -> some View {
    Text(text.uppercased())
      .font(.system(size: 11, weight: .semibold))
      .foregroundColor(Color.captlyMuted)
      .tracking(0.6)
  }

  private func errorBanner(_ message: String) -> some View {
    HStack(spacing: 8) {
      Image(systemName: "exclamationmark.circle.fill")
        .foregroundColor(.red)
        .font(.system(size: 14))
      Text(message)
        .font(.system(size: 13))
        .foregroundColor(.red)
    }
    .padding(12)
    .background(Color.red.opacity(0.07))
    .cornerRadius(10)
  }

  // MARK: – Actions

  private func generate() {
    let desc = description.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !desc.isEmpty else { return }
    descFocused   = false
    isGenerating  = true
    errorMessage  = nil

    // Try token from shared App Group
    let token = UserDefaults(suiteName: "group.com.captionai.app")?
      .string(forKey: "captly_auth_token")

    guard let token, !token.isEmpty else {
      // Fallback: open the main app with pre-filled form
      isGenerating = false
      openMainApp(desc: desc)
      return
    }

    let apiBase = Bundle.main.infoDictionary?["CaptlyAPIURL"] as? String
      ?? "https://captionai.app"
    guard let url = URL(string: "\(apiBase)/api/captions/generate") else {
      errorMessage = "Configuration error."; isGenerating = false; return
    }

    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json",    forHTTPHeaderField: "Content-Type")
    req.setValue("Bearer \(token)",     forHTTPHeaderField: "Authorization")
    req.timeoutInterval = 30

    let niche = UserDefaults(suiteName: "group.com.captionai.app")?
      .string(forKey: "captly_user_niche") ?? "General Business"

    let body: [String: Any] = [
      "niche":          niche,
      "postDescription": desc,
      "tone":           selectedTone,
      "platform":       selectedPlatform,
      "captionLength":  "Medium",
      "includeEmojis":  true,
    ]
    req.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: req) { data, response, error in
      DispatchQueue.main.async {
        self.isGenerating = false

        if error != nil {
          self.errorMessage = "No internet connection."
          return
        }
        guard let http = response as? HTTPURLResponse else {
          self.errorMessage = "Unexpected error — try again."; return
        }
        switch http.statusCode {
        case 401:
          // Token expired — fall back to opening the app
          self.openMainApp(desc: desc)
          return
        case 429:
          self.errorMessage = "Monthly limit reached. Open Captly to upgrade."
          return
        case 200:
          break
        default:
          self.errorMessage = "Something went wrong (code \(http.statusCode))."
          return
        }
        guard
          let data,
          let json     = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let list     = json["captions"] as? [[String: Any]],
          let first    = list.first,
          let caption  = first["caption"] as? String
        else {
          self.errorMessage = "Couldn't read response — try again."; return
        }
        self.generatedCaption  = caption
        self.generatedHashtags = first["hashtags"] as? String ?? ""
      }
    }.resume()
  }

  private func openMainApp(desc: String) {
    let scheme = Bundle.main.infoDictionary?["CaptlyAppScheme"] as? String
      ?? "captionai-mobile"
    var comps        = URLComponents()
    comps.scheme     = scheme
    comps.host       = ""
    comps.path       = "/generate"
    comps.queryItems = [
      URLQueryItem(name: "shareDescription", value: desc),
      URLQueryItem(name: "shareTone",        value: selectedTone),
      URLQueryItem(name: "sharePlatform",    value: selectedPlatform),
      URLQueryItem(name: "autoGenerate",     value: "true"),
    ]
    if let url = comps.url {
      openURL(url)
    }
    onComplete()
  }

  private func copyAll() {
    var parts = [generatedCaption ?? ""]
    if let tags = generatedHashtags, !tags.isEmpty { parts.append(tags) }
    UIPasteboard.general.string = parts.joined(separator: "\n\n")
    isCopied = true
    // Auto-dismiss after 2.5 s once the user has copied
    DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
      self.onComplete()
    }
  }
}
