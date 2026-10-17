### Gradle Build Configuration

- Always use Gradle Kotlin DSL for all Gradle build configuration.
- Use `build.gradle.kts` instead of `build.gradle`.
- Use `settings.gradle.kts` instead of `settings.gradle`.
- Never introduce or convert files to Groovy Gradle DSL unless explicitly requested.
- Write all Gradle configuration using idiomatic Kotlin DSL and type-safe APIs.
- Prefer the Gradle `plugins {}` DSL and Kotlin DSL type-safe accessors where available.
- When modifying an existing Gradle project, preserve Kotlin DSL and keep all new build configuration consistent with it.

## Gradle Invocation

- Always use the committed Gradle wrapper (`gradlew` + `gradle/wrapper/`), with absolute paths:
  ```bash
  /workspace/goetti-recruitment/gradlew -p /workspace/goetti-recruitment <task>
  ```
- Never call a Gradle binary under `~/.gradle/wrapper/dists` directly — the wrapper pins the version.
