import Cocoa
import WebKit

// The desktop preview hosts the same files that are published for phones.
final class Scoreboard: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    let screenshot: String? = {
        let args = CommandLine.arguments
        guard let index = args.firstIndex(of: "--screenshot"), index + 1 < args.count else { return nil }
        return args[index + 1]
    }()

    func applicationDidFinishLaunching(_ notification: Notification) {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1100, height: 800),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Courtside · Volleyball"
        window.center()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: window.contentView!.bounds, configuration: configuration)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        let executable = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL
        let root = executable.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let dist = root.appendingPathComponent("dist")
        webView.loadFileURL(dist.appendingPathComponent("index.html"), allowingReadAccessTo: dist)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let path = screenshot else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            webView.takeSnapshot(with: nil) { image, error in
                guard let image = image, let tiff = image.tiffRepresentation,
                      let bitmap = NSBitmapImageRep(data: tiff),
                      let png = bitmap.representation(using: .png, properties: [:]) else {
                    fputs("Could not capture scoreboard: \(String(describing: error))\n", stderr)
                    exit(1)
                }
                do {
                    let url = URL(fileURLWithPath: path)
                    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                    try png.write(to: url)
                    NSApp.terminate(nil)
                } catch {
                    fputs("Could not save scoreboard: \(error)\n", stderr)
                    exit(1)
                }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

let app = NSApplication.shared
let delegate = Scoreboard()
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()
