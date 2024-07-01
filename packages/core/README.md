# Smyth Runtime Code Standards & Best Practices

> **!!! IMPORTANT !!! This is a work in progress code, many structure may change or get removed**

## Folder Structure

-   **/IO**: Input/Output services. This folder contains classes that perform input/output operations to external resources such as Storage, Database, VectorDB, network, etc.
    -   **/IO/\*/provider**: This subfolder contains providers for different I/O services. For example, /IO/Storage/providers contains classes that implement storage interfaces for specific storage systems like S3, local drive, etc.
-   **/AM**: Agent Management services. This folder contains classes that handle agent data, settings, and runtime.
-   **/MM**: Memory Management services. This folder contains memory management tools and classes (RuntimeContext, LLMContext, Cache).
-   **/Components**: Smyth OS Agents Components.
-   **/utils**: This folder contains utility functions. Functions in this folder should not depend on other packages of the project outside of /utils/\*. These functions are reusable throughout the code.
-   **/helpers**: This folder contains general helper classes/objects/structures. Unlike utils, helpers export an object that exposes a collection of functions specific to a given task.
-   **/types**: This folder contains SmythOS-specific type declarations.

## Naming Standards

### Code Roles

-   **Service**: A service is a top-level subsystem in SmythOS. We have three main service categories: Agent Management, Memory Management, and Input/Output. Files implementing a service should have a `.service.ts` extension.
-   **Provider/Manager**: These are classes that implement a specific service provider or manage a specific resource. They typically take a `.class.ts` extension as they are implemented as classes.
-   **Utility**: A utility file is a collection of reusable general-purpose functions. Files implementing these functions should have a `.utils.ts` extension.
-   **Helper**: A helper is an object that exposes a collection of reusable functions dedicated to a specific task. Helpers can reuse utilities, but utilities should not reuse helpers. Helpers should not be "aware" of SmythOS context (e.g an ACL helper provides functions to check access rights, but it does not "know" that some smyth access right is higher than another, this specificity should be implemented elsewhere)
-   **Handler**: Implements event handlers for a specific task.

### File Naming

Use the following extensions:

-   `.class.ts` for classes
-   `.service.ts` for services
-   `.utils.ts` for utilities
-   `.helper.ts` for helpers
-   `.handler.ts` for handlers
-   `.mw.ts` for middlewares

### Declaration Naming

This section describes the code declaration naming standards:

-   **Constants**: Constants should use uppercase names with underscores (e.g., `MAX_RETRIES`, `API_ENDPOINT`).
-   **Enums and Types**: Should start with `T` (e.g., `TAccessLevel`, `TRole`).
-   **Interfaces**: Should start with `I` (e.g., `IStorageProvider`).
-   **Classes**: Do not have a specific prefix character but should use CamelCase.

All structure names, except constants, should use CamelCase. When a prefix character is used, it should be a capital letter. For example, if `P` is a prefix, the name would be `PCamelCase`.
