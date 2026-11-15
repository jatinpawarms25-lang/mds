import AppKit
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var serverProcess: Process?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        startSyncServerIfNeeded()

        let rect = NSRect(x: 100, y: 100, width: 1400, height: 920)
        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "MDS Desktop OS - AIR 1-10 Suite"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.backgroundColor = NSColor(red: 0.04, green: 0.05, blue: 0.09, alpha: 1.0)
        window.center()
        window.minSize = NSSize(width: 1080, height: 720)
        window.delegate = self

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        let webpagePrefs = WKWebpagePreferences()
        webpagePrefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = webpagePrefs

        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        window.contentView?.addSubview(webView)

        let bundleDir = Bundle.main.resourceURL ?? URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent()
        let htmlUrl = bundleDir.appendingPathComponent("index.html")

        if FileManager.default.fileExists(atPath: htmlUrl.path) {
            webView.loadFileURL(htmlUrl, allowingReadAccessTo: bundleDir)
        } else {
            let fallbackDir = URL(fileURLWithPath: "/Users/jatinpawar/Downloads/MDS_Desktop_OS")
            let fallbackHtml = fallbackDir.appendingPathComponent("index.html")
            if FileManager.default.fileExists(atPath: fallbackHtml.path) {
                webView.loadFileURL(fallbackHtml, allowingReadAccessTo: fallbackDir)
            } else {
                webView.load(URLRequest(url: URL(string: "http://localhost:8765")!))
            }
        }

        window.makeKeyAndOrderFront(nil)
        window.orderFrontRegardless()
        NSApp.activate(ignoringOtherApps: true)
    }

    func startSyncServerIfNeeded() {
        let client = socket(AF_INET, SOCK_STREAM, 0)
        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(8765).bigEndian
        addr.sin_addr.s_addr = inet_addr("127.0.0.1")

        let connected = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                connect(client, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        close(client)

        if connected != 0 {
            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
            let scriptPath = "/Users/jatinpawar/Downloads/MDS_Desktop_OS/serve_sync.py"
            if FileManager.default.fileExists(atPath: scriptPath) {
                proc.arguments = [scriptPath]
                proc.currentDirectoryURL = URL(fileURLWithPath: "/Users/jatinpawar/Downloads/MDS_Desktop_OS")
                try? proc.run()
                self.serverProcess = proc
            }
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            window?.makeKeyAndOrderFront(nil)
            window?.orderFrontRegardless()
        }
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        serverProcess?.terminate()
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
