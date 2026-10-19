export const literalColor =
  /#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/gi

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
        function check(node, value) {
          const ancestors = context.sourceCode.getAncestors(node)
          if (
            ancestors.some(
              (ancestor) =>
                ancestor.type === 'Property' &&
                ancestor.key.type === 'Literal' &&
                typeof ancestor.key.value === 'string' &&
                ancestor.key.value.startsWith('--'),
            )
          )
            return
          for (const match of value.matchAll(literalColor)) {
            context.report({ node, messageId: 'literal', data: { color: match[0] } })
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
