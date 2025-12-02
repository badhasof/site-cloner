/**
 * Extracts React hooks from components
 */

import { parse } from '@babel/parser';
import traverseImport from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import generateImport from '@babel/generator';
import { HookDefinition, HookExtractionResult } from '../types/index.js';

// @ts-ignore - Babel packages have CJS/ESM compatibility issues
const traverse = ((traverseImport as any).default || traverseImport) as any;
// @ts-ignore
const generate = ((generateImport as any).default || generateImport) as any;

/**
 * Extract custom hooks from code
 */
export function extractHooks(code: string): HookExtractionResult {
  const hooks: HookDefinition[] = [];
  const nodesToRemove: NodePath[] = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });

    // Find all custom hook definitions
    traverse(ast, {
      // Function declarations
      FunctionDeclaration(path) {
        if (isCustomHook(path.node)) {
          const hook = extractHookDefinition(path, 'declaration');
          if (hook) {
            hooks.push(hook);
            // Mark for removal if it's a standalone hook
            if (shouldExtractHook(hook)) {
              nodesToRemove.push(path);
            }
          }
        }
      },

      // Variable declarations with arrow/function expressions
      VariableDeclarator(path) {
        const node = path.node;
        
        if (!t.isIdentifier(node.id)) {
          return;
        }

        const name = node.id.name;
        if (!isHookName(name)) {
          return;
        }

        const init = node.init;
        if (!init) {
          return;
        }

        if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
          if (usesHooks(init)) {
            const hook = extractHookDefinitionFromVariable(path);
            if (hook) {
              hooks.push(hook);
              // Mark parent VariableDeclaration for removal
              if (shouldExtractHook(hook)) {
                const parentPath = path.parentPath;
                if (parentPath && t.isVariableDeclaration(parentPath.node)) {
                  nodesToRemove.push(parentPath);
                }
              }
            }
          }
        }
      },

      // Exported hooks
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration;
        
        if (t.isFunctionDeclaration(declaration) && isCustomHook(declaration)) {
          const funcPath = path.get('declaration') as NodePath<t.FunctionDeclaration>;
          const hook = extractHookDefinition(funcPath, 'declaration');
          if (hook) {
            hook.isExported = true;
            hooks.push(hook);
            if (shouldExtractHook(hook)) {
              nodesToRemove.push(path);
            }
          }
        }
      },

      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration;
        
        if (t.isFunctionDeclaration(declaration) && isCustomHook(declaration)) {
          const funcPath = path.get('declaration') as NodePath<t.FunctionDeclaration>;
          const hook = extractHookDefinition(funcPath, 'declaration');
          if (hook) {
            hook.isExported = true;
            hook.name = hook.name || 'useDefault';
            hooks.push(hook);
            if (shouldExtractHook(hook)) {
              nodesToRemove.push(path);
            }
          }
        }
      },
    });

    // Remove extracted hooks from AST
    for (const path of nodesToRemove) {
      path.remove();
    }

    // Generate cleaned code
    const cleanedCode = generate(ast).code;

    return {
      hooks,
      cleanedCode,
    };
  } catch (error) {
    console.error('Error extracting hooks:', error);
    return {
      hooks: [],
      cleanedCode: code,
    };
  }
}

/**
 * Check if a name follows hook naming convention
 */
function isHookName(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

/**
 * Check if a function is a custom hook
 */
function isCustomHook(
  node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
): boolean {
  // Check name
  if (t.isFunctionDeclaration(node) && node.id) {
    const name = node.id.name;
    if (!isHookName(name)) {
      return false;
    }
  }

  // Check if it uses hooks
  return usesHooks(node);
}

/**
 * Check if a function uses React hooks
 */
function usesHooks(
  node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
): boolean {
  let hasHooks = false;

  const body = t.isBlockStatement(node.body) ? node.body : null;
  if (!body) {
    // For arrow functions with expression body, check if it's a hook call
    if (t.isArrowFunctionExpression(node) && t.isCallExpression(node.body)) {
      const callee = node.body.callee;
      if (t.isIdentifier(callee) && isHookName(callee.name)) {
        return true;
      }
    }
    return false;
  }

  traverse(node as any, {
    CallExpression(path) {
      const callee = path.node.callee;
      
      if (t.isIdentifier(callee) && isHookName(callee.name)) {
        hasHooks = true;
        path.stop();
      }
    },
  }, undefined, { body });

  return hasHooks;
}

/**
 * Extract hook definition from function declaration
 */
function extractHookDefinition(
  path: NodePath<t.FunctionDeclaration>,
  context: 'declaration' | 'expression'
): HookDefinition | null {
  const node = path.node;
  
  if (!node.id) {
    return null;
  }

  const name = node.id.name;
  const code = generate(node).code;
  const parameters = extractParameters(node.params);
  const dependencies = findHookDependencies(node);
  const returnType = extractReturnType(node);

  return {
    name,
    code,
    dependencies,
    parameters,
    returnType,
    isExported: false,
  };
}

/**
 * Extract hook definition from variable declaration
 */
function extractHookDefinitionFromVariable(
  path: NodePath<t.VariableDeclarator>
): HookDefinition | null {
  const node = path.node;
  
  if (!t.isIdentifier(node.id)) {
    return null;
  }

  const name = node.id.name;
  const init = node.init;

  if (!init || (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init))) {
    return null;
  }

  // Generate code for the entire variable declaration
  const parentPath = path.parentPath;
  const code = parentPath && t.isVariableDeclaration(parentPath.node)
    ? generate(parentPath.node).code
    : generate(node).code;

  const parameters = extractParameters(init.params);
  const dependencies = findHookDependencies(init);
  const returnType = extractReturnType(init);

  return {
    name,
    code,
    dependencies,
    parameters,
    returnType,
    isExported: false,
  };
}

/**
 * Extract parameter names from function params
 */
function extractParameters(
  params: Array<t.Identifier | t.Pattern | t.RestElement>
): string[] {
  return params.map(param => {
    if (t.isIdentifier(param)) {
      return param.name;
    } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
      return generate(param).code;
    } else if (t.isRestElement(param)) {
      const argName = t.isIdentifier(param.argument) ? param.argument.name : generate(param.argument).code;
      return '...' + argName;
    }
    return generate(param).code;
  });
}

/**
 * Find hook dependencies (other hooks used)
 */
function findHookDependencies(
  node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
): string[] {
  const dependencies = new Set<string>();

  traverse(node as any, {
    CallExpression(path) {
      const callee = path.node.callee;
      
      if (t.isIdentifier(callee) && isHookName(callee.name)) {
        dependencies.add(callee.name);
      }
    },
  }, undefined, node);

  return Array.from(dependencies);
}

/**
 * Extract return type from function
 */
function extractReturnType(
  node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
): string | undefined {
  // Check TypeScript return type annotation
  if (node.returnType && t.isTSTypeAnnotation(node.returnType)) {
    return generate(node.returnType.typeAnnotation).code;
  }

  // Try to infer from return statement
  let returnType: string | undefined;

  const body = t.isBlockStatement(node.body) ? node.body : null;
  if (!body) {
    // Arrow function with expression body
    if (t.isArrowFunctionExpression(node) && t.isExpression(node.body)) {
      returnType = inferTypeFromExpression(node.body);
    }
    return returnType;
  }

  traverse(node as any, {
    ReturnStatement(path) {
      const argument = path.node.argument;
      if (argument && !returnType) {
        returnType = inferTypeFromExpression(argument);
        path.stop();
      }
    },
  }, undefined, { body });

  return returnType;
}

/**
 * Infer type from expression (simplified)
 */
function inferTypeFromExpression(expr: t.Expression | t.JSXElement | t.JSXFragment): string | undefined {
  if (t.isObjectExpression(expr)) {
    return 'object';
  } else if (t.isArrayExpression(expr)) {
    return 'array';
  } else if (t.isBooleanLiteral(expr)) {
    return 'boolean';
  } else if (t.isNumericLiteral(expr)) {
    return 'number';
  } else if (t.isStringLiteral(expr)) {
    return 'string';
  } else if (t.isNullLiteral(expr)) {
    return 'null';
  }
  
  return undefined;
}

/**
 * Determine if a hook should be extracted to a separate file
 */
function shouldExtractHook(hook: HookDefinition): boolean {
  // Extract hooks that:
  // 1. Are reusable (use multiple built-in hooks)
  // 2. Are complex (more than 10 lines)
  // 3. Are exported
  
  const lines = hook.code.split('\n').length;
  const complexityThreshold = 10;
  const isComplex = lines > complexityThreshold;
  const isReusable = hook.dependencies.length >= 2;
  
  return hook.isExported || isComplex || isReusable;
}

/**
 * Analyze hook usage in a component
 */
export function analyzeHookUsage(code: string): {
  hookCalls: string[];
  stateVariables: string[];
  effects: number;
  refs: string[];
} {
  const hookCalls: string[] = [];
  const stateVariables: string[] = [];
  const refs: string[] = [];
  let effects = 0;

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        
        if (!t.isIdentifier(callee)) {
          return;
        }

        const hookName = callee.name;
        
        if (!isHookName(hookName)) {
          return;
        }

        hookCalls.push(hookName);

        // Track state variables
        if (hookName === 'useState') {
          const parent = path.parent;
          if (t.isVariableDeclarator(parent) && t.isArrayPattern(parent.id)) {
            const elements = parent.id.elements;
            if (elements[0] && t.isIdentifier(elements[0])) {
              stateVariables.push(elements[0].name);
            }
          }
        }

        // Count effects
        if (hookName === 'useEffect' || hookName === 'useLayoutEffect') {
          effects++;
        }

        // Track refs
        if (hookName === 'useRef') {
          const parent = path.parent;
          if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
            refs.push(parent.id.name);
          }
        }
      },
    });
  } catch (error) {
    console.error('Error analyzing hook usage:', error);
  }

  return {
    hookCalls,
    stateVariables,
    effects,
    refs,
  };
}
