/**
 * Splits code into individual React components
 */

import { parse } from '@babel/parser';
import traverseImport from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import generateImport from '@babel/generator';
import { DetectedComponent, ComponentSplittingOptions, HookUsage } from '../types/index.js';

// @ts-ignore - Babel packages have CJS/ESM compatibility issues
const traverse = ((traverseImport as any).default || traverseImport) as any;
// @ts-ignore
const generate = ((generateImport as any).default || generateImport) as any;

/**
 * Split code into individual components
 */
export function splitComponents(
  code: string,
  moduleId: string | number,
  options: ComponentSplittingOptions = {}
): DetectedComponent[] {
  const {
    minLines = 3,
    extractInlineComponents = true,
    nameAnonymousComponents = true,
  } = options;

  const components: DetectedComponent[] = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });

    // Track all identifiers for dependency detection
    const allIdentifiers = new Set<string>();
    const componentNames = new Set<string>();

    // First pass: collect all component names
    traverse(ast, {
      FunctionDeclaration(path) {
        if (isComponentFunction(path.node)) {
          componentNames.add(path.node.id!.name);
        }
      },
      VariableDeclarator(path) {
        if (isComponentVariableDeclarator(path.node)) {
          if (t.isIdentifier(path.node.id)) {
            componentNames.add(path.node.id.name);
          }
        }
      },
    });

    // Second pass: extract components
    traverse(ast, {
      // Function declarations
      FunctionDeclaration(path) {
        if (isComponentFunction(path.node)) {
          const component = extractFunctionComponent(
            path,
            'function',
            moduleId,
            allIdentifiers,
            componentNames
          );
          if (component && shouldExtractComponent(component, minLines)) {
            components.push(component);
          }
        }
      },

      // Variable declarations with function expressions or arrow functions
      VariableDeclarator(path) {
        if (isComponentVariableDeclarator(path.node)) {
          const component = extractVariableComponent(
            path,
            moduleId,
            allIdentifiers,
            componentNames,
            nameAnonymousComponents
          );
          if (component && shouldExtractComponent(component, minLines)) {
            components.push(component);
          }
        }
      },

      // Export default/named components
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration;
        if (t.isFunctionDeclaration(declaration) && isComponentFunction(declaration)) {
          const component = extractFunctionComponent(
            path.get('declaration') as NodePath<t.FunctionDeclaration>,
            'function',
            moduleId,
            allIdentifiers,
            componentNames
          );
          if (component) {
            component.isExported = true;
            if (shouldExtractComponent(component, minLines)) {
              components.push(component);
            }
          }
        }
      },

      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration;
        if (t.isFunctionDeclaration(declaration) && isComponentFunction(declaration)) {
          const component = extractFunctionComponent(
            path.get('declaration') as NodePath<t.FunctionDeclaration>,
            'function',
            moduleId,
            allIdentifiers,
            componentNames
          );
          if (component) {
            component.isExported = true;
            component.name = component.name || 'DefaultExport';
            if (shouldExtractComponent(component, minLines)) {
              components.push(component);
            }
          }
        } else if (t.isIdentifier(declaration)) {
          // Mark existing component as exported
          const componentName = declaration.name;
          const existing = components.find(c => c.name === componentName);
          if (existing) {
            existing.isExported = true;
          }
        }
      },
    });

    // Extract inline components if requested
    if (extractInlineComponents) {
      const inlineComps = extractInlineComponentsFromAST(ast, moduleId, allIdentifiers, componentNames);
      components.push(...inlineComps.filter(c => shouldExtractComponent(c, minLines)));
    }

  } catch (error) {
    console.error('Error splitting components:', error);
  }

  return components;
}

/**
 * Check if a function is a React component
 */
function isComponentFunction(node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression): boolean {
  // Check for PascalCase name
  if (t.isFunctionDeclaration(node) && node.id) {
    const name = node.id.name;
    if (!/^[A-Z]/.test(name)) {
      return false;
    }
  }

  // Check if it returns JSX
  return returnsJSX(node);
}

/**
 * Check if a variable declarator contains a component
 */
function isComponentVariableDeclarator(node: t.VariableDeclarator): boolean {
  if (!t.isIdentifier(node.id)) {
    return false;
  }

  const name = node.id.name;
  
  // Must be PascalCase
  if (!/^[A-Z]/.test(name)) {
    return false;
  }

  const init = node.init;
  
  // Arrow function or function expression
  if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
    return returnsJSX(init);
  }

  // forwardRef
  if (t.isCallExpression(init)) {
    return isForwardRefCall(init) || isMemoCall(init);
  }

  return false;
}

/**
 * Check if function returns JSX
 */
function returnsJSX(node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression): boolean {
  let hasJSX = false;

  // For arrow functions with expression body
  if (t.isArrowFunctionExpression(node) && !t.isBlockStatement(node.body)) {
    return t.isJSXElement(node.body) || t.isJSXFragment(node.body);
  }

  // Check block statement
  if (t.isBlockStatement(node.body)) {
    traverse(node as any, {
      ReturnStatement(path) {
        const argument = path.node.argument;
        if (argument && (t.isJSXElement(argument) || t.isJSXFragment(argument))) {
          hasJSX = true;
          path.stop();
        }
      },
    }, undefined, { body: node.body });
  }

  return hasJSX;
}

/**
 * Check if call is React.forwardRef
 */
function isForwardRefCall(node: t.CallExpression): boolean {
  const callee = node.callee;
  return (
    (t.isIdentifier(callee, { name: 'forwardRef' })) ||
    (t.isMemberExpression(callee) &&
      t.isIdentifier(callee.object, { name: 'React' }) &&
      t.isIdentifier(callee.property, { name: 'forwardRef' }))
  );
}

/**
 * Check if call is React.memo
 */
function isMemoCall(node: t.CallExpression): boolean {
  const callee = node.callee;
  return (
    (t.isIdentifier(callee, { name: 'memo' })) ||
    (t.isMemberExpression(callee) &&
      t.isIdentifier(callee.object, { name: 'React' }) &&
      t.isIdentifier(callee.property, { name: 'memo' }))
  );
}

/**
 * Extract function component
 */
function extractFunctionComponent(
  path: NodePath<t.FunctionDeclaration>,
  type: 'function' | 'arrow',
  moduleId: string | number,
  allIdentifiers: Set<string>,
  componentNames: Set<string>
): DetectedComponent | null {
  const node = path.node;
  
  if (!node.id) {
    return null;
  }

  const name = node.id.name;
  const code = generate(node).code;
  const hooks = extractHooksFromFunction(node);
  const dependencies = findDependencies(node, allIdentifiers, componentNames, name);

  return {
    name,
    code,
    type,
    hooks,
    dependencies,
    isExported: false,
    moduleId,
    location: {
      start: node.start || 0,
      end: node.end || 0,
    },
  };
}

/**
 * Extract component from variable declaration
 */
function extractVariableComponent(
  path: NodePath<t.VariableDeclarator>,
  moduleId: string | number,
  allIdentifiers: Set<string>,
  componentNames: Set<string>,
  nameAnonymous: boolean
): DetectedComponent | null {
  const node = path.node;
  
  if (!t.isIdentifier(node.id)) {
    return null;
  }

  const name = node.id.name;
  const init = node.init;

  if (!init) {
    return null;
  }

  let type: 'arrow' | 'function' | 'forwardRef' | 'memo' = 'arrow';
  let functionNode: t.FunctionExpression | t.ArrowFunctionExpression | null = null;

  if (t.isArrowFunctionExpression(init)) {
    type = 'arrow';
    functionNode = init;
  } else if (t.isFunctionExpression(init)) {
    type = 'function';
    functionNode = init;
  } else if (t.isCallExpression(init)) {
    if (isForwardRefCall(init)) {
      type = 'forwardRef';
      const arg = init.arguments[0];
      if (t.isArrowFunctionExpression(arg) || t.isFunctionExpression(arg)) {
        functionNode = arg;
      }
    } else if (isMemoCall(init)) {
      type = 'memo';
      const arg = init.arguments[0];
      if (t.isArrowFunctionExpression(arg) || t.isFunctionExpression(arg)) {
        functionNode = arg;
      }
    }
  }

  if (!functionNode) {
    return null;
  }

  // Generate code for the entire declaration
  const parentPath = path.parentPath;
  const code = parentPath && t.isVariableDeclaration(parentPath.node)
    ? generate(parentPath.node).code
    : generate(node).code;

  const hooks = extractHooksFromFunction(functionNode);
  const dependencies = findDependencies(functionNode, allIdentifiers, componentNames, name);

  return {
    name,
    code,
    type,
    hooks,
    dependencies,
    isExported: false,
    moduleId,
    location: {
      start: node.start || 0,
      end: node.end || 0,
    },
  };
}

/**
 * Extract hooks from a function
 */
function extractHooksFromFunction(
  node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
): HookUsage[] {
  const hooks: HookUsage[] = [];

  const body = t.isBlockStatement(node.body) ? node.body : null;
  if (!body) {
    return hooks;
  }

  traverse(node as any, {
    CallExpression(path) {
      const callee = path.node.callee;
      
      if (t.isIdentifier(callee)) {
        const hookName = callee.name;
        
        // Check if it's a hook (starts with 'use')
        if (hookName.startsWith('use')) {
          const hookType = getHookType(hookName);
          
          hooks.push({
            name: hookName,
            type: hookType,
            line: path.node.loc?.start.line,
          });
        }
      }
    },
  }, undefined, { body });

  return hooks;
}

/**
 * Determine hook type from name
 */
function getHookType(name: string): HookUsage['type'] {
  if (name === 'useState') return 'state';
  if (name === 'useEffect' || name === 'useLayoutEffect') return 'effect';
  if (name === 'useRef') return 'ref';
  if (name === 'useMemo') return 'memo';
  if (name === 'useCallback') return 'callback';
  if (name === 'useContext') return 'context';
  if (name === 'useReducer') return 'reducer';
  return 'custom';
}

/**
 * Find dependencies (imports, components used)
 */
function findDependencies(
  node: t.Node,
  allIdentifiers: Set<string>,
  componentNames: Set<string>,
  ownName: string
): string[] {
  const dependencies = new Set<string>();

  traverse(node as any, {
    Identifier(path) {
      const name = path.node.name;
      
      // Skip own name, built-ins, and common variables
      if (name === ownName || 
          name === 'React' ||
          name === 'useState' ||
          name === 'useEffect' ||
          name === 'props' ||
          name === 'ref') {
        return;
      }

      // Check if it's another component
      if (componentNames.has(name)) {
        dependencies.add(name);
      }
    },
    
    JSXIdentifier(path) {
      const name = path.node.name;
      
      // Check if it's a component (PascalCase)
      if (/^[A-Z]/.test(name) && componentNames.has(name)) {
        dependencies.add(name);
      }
    },
  }, undefined, node);

  return Array.from(dependencies);
}

/**
 * Extract inline components (components defined inside other components)
 */
function extractInlineComponentsFromAST(
  ast: t.File,
  moduleId: string | number,
  allIdentifiers: Set<string>,
  componentNames: Set<string>
): DetectedComponent[] {
  const inlineComponents: DetectedComponent[] = [];

  // This is a simplified version - full implementation would detect
  // functions defined inside other functions that return JSX
  // For now, we'll skip this to avoid complexity

  return inlineComponents;
}

/**
 * Check if component should be extracted based on options
 */
function shouldExtractComponent(component: DetectedComponent, minLines: number): boolean {
  const lines = component.code.split('\n').length;
  return lines >= minLines;
}
