/**
 * Converts React.createElement calls back to JSX syntax
 */

import { parse } from '@babel/parser';
import traverseImport from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import generateImport from '@babel/generator';

// @ts-ignore - Babel packages have CJS/ESM compatibility issues
const traverse = ((traverseImport as any).default || traverseImport) as any;
// @ts-ignore
const generate = ((generateImport as any).default || generateImport) as any;
import { format } from 'prettier';
import { JSXConversionOptions } from '../types/index.js';

/**
 * Convert code with React.createElement calls to JSX
 */
export async function convertToJSX(code: string, options: JSXConversionOptions = {}): Promise<string> {
  const {
    useFragmentShorthand = true,
    preserveComments = true,
    format: shouldFormat = true,
    prettierOptions = {}
  } = options;

  try {
    // Parse the code with JSX support
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });

    // Traverse and transform createElement calls
    traverse(ast, {
      CallExpression(path: NodePath<t.CallExpression>) {
        const { callee } = path.node;
        
        // Detect different createElement patterns
        const isReactCreateElement = 
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object, { name: 'React' }) &&
          t.isIdentifier(callee.property, { name: 'createElement' });
        
        const isCreateElement = 
          t.isIdentifier(callee, { name: 'createElement' });
        
        const isJsxRuntime = 
          t.isIdentifier(callee, { name: '_jsx' }) ||
          t.isIdentifier(callee, { name: '_jsxs' }) ||
          t.isIdentifier(callee, { name: 'jsx' }) ||
          t.isIdentifier(callee, { name: 'jsxs' });

        if (isReactCreateElement || isCreateElement || isJsxRuntime) {
          const jsxElement = convertCreateElementToJSX(path.node, useFragmentShorthand);
          if (jsxElement) {
            path.replaceWith(jsxElement);
          }
        }
      }
    });

    // Generate code from the transformed AST
    const output = generate(ast, {
      comments: preserveComments,
      retainLines: false,
    }, code);

    // Format with prettier if requested
    if (shouldFormat) {
      try {
        return await format(output.code, {
          parser: 'babel',
          semi: true,
          singleQuote: true,
          trailingComma: 'es5',
          printWidth: 100,
          tabWidth: 2,
          ...prettierOptions,
        });
      } catch (e) {
        // If formatting fails, return unformatted
        console.warn('Prettier formatting failed:', e);
        return output.code;
      }
    }

    return output.code;
  } catch (error) {
    console.error('Error converting to JSX:', error);
    return code; // Return original code on error
  }
}

/**
 * Convert a single createElement call to JSX element
 */
function convertCreateElementToJSX(
  node: t.CallExpression,
  useFragmentShorthand: boolean
): t.JSXElement | t.JSXFragment | null {
  const args = node.arguments;
  
  if (args.length === 0) {
    return null;
  }

  // Extract type, props, and children
  let elementType: t.Expression;
  let props: t.ObjectExpression | null = null;
  let children: t.Expression[] = [];

  // Handle different call patterns
  const callee = node.callee;

  if (t.isIdentifier(callee, { name: '_jsx' }) ||
      t.isIdentifier(callee, { name: '_jsxs' }) ||
      t.isIdentifier(callee, { name: 'jsx' }) ||
      t.isIdentifier(callee, { name: 'jsxs' })) {
    // JSX runtime: _jsx(type, { ...props, children })
    const firstArg = args[0];
    if (!firstArg || t.isSpreadElement(firstArg) || t.isArgumentPlaceholder(firstArg)) {
      return null;
    }
    elementType = firstArg;
    if (args[1] && t.isObjectExpression(args[1])) {
      props = args[1];
      // Extract children from props
      const childrenProp = props.properties.find(
        prop => t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key, { name: 'children' })
      ) as t.ObjectProperty | undefined;

      if (childrenProp && childrenProp.value) {
        if (t.isArrayExpression(childrenProp.value)) {
          children = childrenProp.value.elements.filter((el): el is t.Expression => el !== null && !t.isSpreadElement(el));
        } else if (t.isExpression(childrenProp.value)) {
          children = [childrenProp.value];
        }
        // Remove children from props
        props.properties = props.properties.filter(prop => prop !== childrenProp);
      }
    }
  } else {
    // React.createElement(type, props, ...children)
    const firstArg = args[0];
    if (!firstArg || t.isSpreadElement(firstArg) || t.isArgumentPlaceholder(firstArg)) {
      return null;
    }
    elementType = firstArg;
    if (args[1] && t.isObjectExpression(args[1])) {
      props = args[1];
    }
    children = args.slice(2).filter((arg): arg is t.Expression =>
      arg !== null && !t.isSpreadElement(arg) && !t.isArgumentPlaceholder(arg)
    );
  }

  // Get element name
  let elementName: string;
  if (t.isStringLiteral(elementType)) {
    elementName = elementType.value;
  } else if (t.isIdentifier(elementType)) {
    elementName = elementType.name;
  } else if (t.isMemberExpression(elementType)) {
    // Handle React.Fragment, etc.
    const generated = generate(elementType as any).code;
    elementName = generated;
  } else {
    // Complex expression, return null
    return null;
  }

  // Handle Fragment
  if (elementName === 'Fragment' || elementName === 'React.Fragment') {
    if (useFragmentShorthand && (!props || props.properties.length === 0)) {
      return createJSXFragment(children);
    }
    elementName = 'Fragment';
  }

  // Create JSX element
  return createJSXElement(elementName, props, children);
}

/**
 * Create a JSX element from parts
 */
function createJSXElement(
  name: string,
  props: t.ObjectExpression | null,
  children: t.Expression[]
): t.JSXElement {
  // Create opening element
  const openingElement = t.jsxOpeningElement(
    createJSXIdentifier(name),
    convertPropsToJSXAttributes(props),
    children.length === 0
  );

  // Create closing element if there are children
  const closingElement = children.length > 0 
    ? t.jsxClosingElement(createJSXIdentifier(name))
    : null;

  // Convert children
  const jsxChildren = children.map(convertChildToJSX).filter((c): c is t.JSXElement | t.JSXFragment | t.JSXText | t.JSXExpressionContainer => c !== null);

  return t.jsxElement(openingElement, closingElement, jsxChildren, children.length === 0);
}

/**
 * Create JSX fragment
 */
function createJSXFragment(children: t.Expression[]): t.JSXFragment {
  const jsxChildren = children.map(convertChildToJSX).filter((c): c is t.JSXElement | t.JSXFragment | t.JSXText | t.JSXExpressionContainer => c !== null);
  
  return t.jsxFragment(
    t.jsxOpeningFragment(),
    t.jsxClosingFragment(),
    jsxChildren
  );
}

/**
 * Create JSX identifier (handle namespaced names)
 */
function createJSXIdentifier(name: string): t.JSXIdentifier | t.JSXMemberExpression {
  if (name.includes('.')) {
    // Handle namespaced components like React.Fragment
    const parts = name.split('.');
    let expr: t.JSXIdentifier | t.JSXMemberExpression = t.jsxIdentifier(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      expr = t.jsxMemberExpression(expr, t.jsxIdentifier(parts[i]));
    }
    return expr;
  }
  return t.jsxIdentifier(name);
}

/**
 * Convert props object to JSX attributes
 */
function convertPropsToJSXAttributes(
  props: t.ObjectExpression | null
): Array<t.JSXAttribute | t.JSXSpreadAttribute> {
  if (!props) {
    return [];
  }

  const attributes: Array<t.JSXAttribute | t.JSXSpreadAttribute> = [];

  for (const prop of props.properties) {
    if (t.isObjectProperty(prop)) {
      // Regular property
      const key = prop.key;
      const value = prop.value;

      let attrName: string;
      if (t.isIdentifier(key)) {
        attrName = key.name;
      } else if (t.isStringLiteral(key)) {
        attrName = key.value;
      } else {
        continue; // Skip complex keys
      }

      // Skip null/undefined values
      if (t.isNullLiteral(value) || t.isIdentifier(value, { name: 'undefined' })) {
        continue;
      }

      // Ensure value is an Expression before processing
      if (!t.isExpression(value) && !t.isPatternLike(value)) {
        continue;
      }

      // Create attribute
      const attrValue = convertPropValueToJSXAttributeValue(value as t.Expression);
      if (attrValue !== null) {
        const attr = t.jsxAttribute(t.jsxIdentifier(attrName), attrValue);
        attributes.push(attr);
      } else {
        // Boolean true - just add the attribute without value
        attributes.push(t.jsxAttribute(t.jsxIdentifier(attrName)));
      }
    } else if (t.isSpreadElement(prop)) {
      // Spread properties
      if (t.isExpression(prop.argument)) {
        attributes.push(t.jsxSpreadAttribute(prop.argument));
      }
    }
  }

  return attributes;
}

/**
 * Convert prop value to JSX attribute value
 */
function convertPropValueToJSXAttributeValue(
  value: t.Expression
): t.JSXExpressionContainer | t.StringLiteral | null {
  if (t.isStringLiteral(value)) {
    return value;
  }
  
  // Boolean true can be omitted, but we'll keep it explicit
  if (t.isBooleanLiteral(value) && value.value === true) {
    return null;
  }

  // Wrap other expressions in {}
  return t.jsxExpressionContainer(value);
}

/**
 * Convert child expression to JSX child
 */
function convertChildToJSX(
  child: t.Expression
): t.JSXElement | t.JSXFragment | t.JSXText | t.JSXExpressionContainer | null {
  // String literals become JSX text
  if (t.isStringLiteral(child)) {
    return t.jsxText(child.value);
  }

  // Nested createElement calls - already converted by traversal
  if (t.isJSXElement(child)) {
    return child;
  }

  if (t.isJSXFragment(child)) {
    return child;
  }

  // Skip null/undefined/false children
  if (t.isNullLiteral(child) || 
      t.isIdentifier(child, { name: 'undefined' }) ||
      (t.isBooleanLiteral(child) && child.value === false)) {
    return null;
  }

  // Array of children
  if (t.isArrayExpression(child)) {
    // Arrays should be spread into parent, but we'll wrap in expression for now
    return t.jsxExpressionContainer(child);
  }

  // Wrap other expressions
  return t.jsxExpressionContainer(child);
}
