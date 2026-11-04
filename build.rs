use std::{env, path::PathBuf, process::Command};

fn main() {
    for path in ["launcher.swift", "web", "build-web.mjs"] {
        println!("cargo:rerun-if-changed={path}");
    }
    assert!(Command::new("node").arg("build-web.mjs").status().unwrap().success(), "Build phone website");
    let output = PathBuf::from(env::var_os("OUT_DIR").unwrap());
    let profile = output.ancestors().nth(3).unwrap();
    assert!(Command::new("swiftc")
        .args(["-module-cache-path"])
        .arg(env::temp_dir().join("courtside-swift-cache"))
        .args(["launcher.swift", "-o"])
        .arg(profile.join("courtside-preview"))
        .args(["-framework", "Cocoa", "-framework", "WebKit"])
        .status().unwrap().success(), "Build macOS preview");
}
