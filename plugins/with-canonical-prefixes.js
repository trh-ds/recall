const { withProjectBuildGradle } = require("expo/config-plugins");

// Windows link fix. When the NDK path contains a space (e.g. C:\Users\Tirth Patel\...),
// CMake writes the compiler into rules.ninja as its 8.3 short name — CLANG_~1.EXE, since
// "++" is not a legal 8.3 character. The NDK also passes -no-canonical-prefixes, so clang
// never resolves that back to clang++.exe, runs as the *C* driver, and silently drops
// -lc++. Every std:: symbol then comes back undefined at link time (react-native-screens
// dies first). -canonical-prefixes lands after the NDK's flag in CMAKE_CXX_FLAGS and wins.
// No-op on space-free paths, so it is safe on macOS/Linux/CI too.
const FLAG = "-DCMAKE_CXX_FLAGS=-canonical-prefixes";

// Must sit BEFORE the apply-plugin lines: com.facebook.react.rootproject evaluates :app
// while it is applied, and AGP ignores defaultConfig edits made after a module is
// evaluated — appending this block to the end of the file silently does nothing to :app.
const ANCHOR = 'apply plugin: "expo-root-project"';

const BLOCK = `subprojects { sub ->
  ["com.android.library", "com.android.application"].each { id ->
    sub.plugins.withId(id) {
      sub.android.defaultConfig.externalNativeBuild.cmake.arguments "${FLAG}"
    }
  }
}

${ANCHOR}`;

module.exports = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(FLAG)) {
      if (!cfg.modResults.contents.includes(ANCHOR)) {
        throw new Error(`with-canonical-prefixes: anchor not found in build.gradle: ${ANCHOR}`);
      }
      cfg.modResults.contents = cfg.modResults.contents.replace(ANCHOR, BLOCK);
    }
    return cfg;
  });
