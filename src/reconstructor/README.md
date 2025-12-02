# JSX Reconstructor Module

This module converts React.createElement calls back to JSX syntax and splits code into individual React components.

## Overview

The reconstructor takes deobfuscated/cleaned JavaScript modules and:
1. Converts `React.createElement()` calls to JSX syntax
2. Extracts individual React components
3. Identifies and extracts custom hooks
4. Analyzes component dependencies

## Files

### `index.ts` - Main Orchestration
Main entry point that coordinates the reconstruction process.

**Key Function:**
```typescript
async function reconstruct(modules: CleanModule[], config?: ReconstructorConfig): Promise<DetectedComponent[]>
```

### `jsxConverter.ts` - JSX Conversion
Converts various React.createElement patterns to JSX:
- `React.createElement(type, props, ...children)`
- `_jsx(type, { ...props, children })`
- `_jsxs(type, { ...props, children })`
- `createElement(type, props, children)`

**Features:**
- Converts React.Fragment to `<>...</>`
- Handles spread props
- Supports conditional rendering
- Properly formats JSX with Prettier

### `componentSplitter.ts` - Component Extraction
Splits code into individual React components by detecting:
- Function declarations (PascalCase names)
- Arrow functions that return JSX
- `React.forwardRef` wrappers
- `React.memo` wrappers
- Class components

**Detects:**
- Component dependencies
- Hook usage within components
- Props types (if available)
- Export status

### `hookExtractor.ts` - Hook Extraction
Extracts custom React hooks from code:
- Identifies functions starting with `use` that call other hooks
- Extracts hook dependencies
- Determines hook parameters and return types
- Separates reusable hooks for individual files

## Usage

```typescript
import { reconstruct } from './reconstructor';

// Basic usage
const components = await reconstruct(cleanedModules);

// With configuration
const components = await reconstruct(cleanedModules, {
  jsxOptions: {
    useFragmentShorthand: true,
    format: true,
  },
  componentOptions: {
    minLines: 3,
    extractInlineComponents: true,
  },
  extractHooks: true,
});

// Export to files
import { exportComponentsToFiles } from './reconstructor';
const files = exportComponentsToFiles(components, 'tsx');
```

## Configuration Options

### JSXConversionOptions
- `useFragmentShorthand` - Use `<>` instead of `<React.Fragment>`
- `preserveComments` - Keep comments in output
- `format` - Format with Prettier
- `prettierOptions` - Custom Prettier configuration

### ComponentSplittingOptions
- `minLines` - Minimum lines for component extraction
- `extractInlineComponents` - Extract components defined inside other components
- `nameAnonymousComponents` - Generate names for anonymous components

### ReconstructorConfig
- `jsxOptions` - JSX conversion options
- `componentOptions` - Component splitting options
- `extractHooks` - Whether to extract custom hooks
- `formatOutput` - Whether to format final output

## Output

The `reconstruct` function returns an array of `DetectedComponent` objects:

```typescript
interface DetectedComponent {
  name: string;
  code: string;
  type: 'function' | 'class' | 'arrow' | 'forwardRef' | 'memo';
  hooks: HookUsage[];
  dependencies: string[];
  isExported: boolean;
  moduleId: string | number;
  location?: { start: number; end: number };
}
```

## Utility Functions

### `getReconstructionStats(components)`
Get statistics about the reconstruction:
- Total components
- Components by type
- Most used hooks
- Average hooks per component

### `generateDependencyGraph(components)`
Creates a dependency graph showing component relationships.

### `findCircularDependencies(components)`
Detects circular dependencies between components.

### `exportComponentsToFiles(components, format)`
Converts components to individual files with proper imports.

## Edge Cases Handled

- Spread props: `{...props}`
- Conditional rendering: `{condition && <Component />}`
- Array.map() calls: `{items.map(item => <Item key={item.id} />)}`
- Nested createElement calls
- Fragment shorthand
- Boolean props
- Null/undefined children

## Dependencies

- `@babel/parser` - Parse JavaScript/JSX
- `@babel/traverse` - AST traversal
- `@babel/types` - AST node creation/checking
- `@babel/generator` - Generate code from AST
- `prettier` - Code formatting

## Example

Input (obfuscated):
```javascript
React.createElement('div', { className: 'container' },
  React.createElement('h1', null, 'Hello'),
  React.createElement('p', null, 'World')
)
```

Output (JSX):
```jsx
function Component() {
  return (
    <div className="container">
      <h1>Hello</h1>
      <p>World</p>
    </div>
  );
}

export default Component;
```
