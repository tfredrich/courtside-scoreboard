// Adapt Craft Anything's native entry point to the shared web scoreboard.
use std::{os::unix::process::CommandExt, process::Command};

fn main() {
    let executable = std::env::current_exe().expect("Locate Courtside");
    let error = Command::new(executable.with_file_name("courtside-preview"))
        .args(std::env::args_os().skip(1))
        .exec();
    eprintln!("Could not open Courtside: {error}");
    std::process::exit(1);
}
