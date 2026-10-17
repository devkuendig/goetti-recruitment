# Rule: Application Architecture

## Scope

This rule applies whenever creating or modifying application architecture, business logic, or module structure.

## Business Logic

- Model business behavior explicitly rather than exposing persistence operations directly.
- Keep business rules inside the application/domain layer.
- Avoid placing business logic in controllers, repositories, or infrastructure components.

## CQRS

- Apply Command Query Responsibility Segregation (CQRS) for business logic.
- Separate commands (state-changing operations) from queries (read-only operations).
- Commands must encapsulate business behavior and invariants.
- Queries should focus on efficient data retrieval without introducing business behavior.

## CRUD

- For simple CRUD scenarios where no meaningful business behavior exists, implement dedicated use-case services instead of introducing unnecessary CQRS complexity.
- Prefer simplicity when domain complexity does not justify additional architectural patterns.

## Layering

Maintain clear separation between:

- Presentation
- Application
- Domain
- Infrastructure

Dependencies must always point inward toward the domain.

## General Principles

- Business logic should remain independent of frameworks and infrastructure.
- Prefer explicit use cases over generic service classes.
- Introduce architectural complexity only when it provides measurable value.

## Transaction Management

- Transaction boundaries must start at the application service/use-case layer.
- Controllers, repositories, and mappers must not define transaction boundaries.
- A single application use case should normally execute within one transaction boundary.

## Transaction Principles

- Keep transactions as short as possible.
- Be consistent at which service/layer a transaction is started.
- Do not expose transactional concerns to the domain model.
- Do not rely on distributed transactions between modules.
- For operations crossing service boundaries, design for eventual consistency.

## Read Operations

- Queries should not require transactions unless consistency requirements justify them.
- Avoid unnecessary transactional context for read-only operations.
