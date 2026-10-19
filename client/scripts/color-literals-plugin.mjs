const colorStart =
  /#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi

export function* colorLiterals(value) {
  const source = value.replace(/\b(?:https?:\/\/[^\s'"<>]+|url\([^)]*\))/gi, (url) =>
    ' '.repeat(url.length),
  )
  for (const match of source.matchAll(colorStart)) {
    if (match[0].startsWith('#')) {
      yield { color: match[0], index: match.index }
      continue
    }
    let end = match.index + match[0].length
    let depth = 1
    while (end < source.length && depth) {
      if (source[end] === '(') depth++
      if (source[end] === ')') depth--
      end++
    }
    const color = source.slice(match.index, end)
    if (!depth && !/\bvar\(/i.test(color)) yield { color, index: match.index }
  }
}

export default {
  meta: { name: 'color-literals' },
  rules: {
    'no-literal': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: { literal: '{{color}}' },
      },
      create(context) {
        if (/[/\\]components[/\\](?:features|terrains)[/\\]/.test(context.filename)) return {}
        function check(node, value) {
          const ancestors = context.sourceCode.getAncestors(node)
          if (
            ancestors.some(
              (ancestor) =>
                (ancestor.type === 'Property' &&
                  ancestor.key.type === 'Literal' &&
                  typeof ancestor.key.value === 'string' &&
                  ancestor.key.value.startsWith('--')) ||
                (ancestor.type === 'VariableDeclarator' &&
                  ancestor.id.type === 'Identifier' &&
                  ancestor.id.name.endsWith('Palette') &&
                  ancestors.some(
                    (parent) =>
                      parent.type === 'VariableDeclaration' && parent.kind === 'const',
                  )) ||
                (ancestor.type === 'PropertyDefinition' &&
                  ancestor.static &&
                  ancestor.key.name === 'accent') ||
                (ancestor.type === 'JSXAttribute' &&
                  ['href', 'to', 'id'].includes(ancestor.name.name)) ||
                (ancestor.type === 'Property' &&
                  ['href', 'to', 'id'].includes(ancestor.key.name ?? ancestor.key.value)),
            )
          )
            return
          for (const { color } of colorLiterals(value)) {
            context.report({ node, messageId: 'literal', data: { color } })
          }
        }
        return {
          Literal(node) {
            if (typeof node.value === 'string') check(node, node.value)
          },
          TemplateElement(node) {
            check(node, node.value.cooked ?? node.value.raw)
          },
        }
      },
    },
  },
}
