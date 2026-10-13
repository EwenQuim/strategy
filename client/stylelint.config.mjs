export default {
  rules: {
    'color-named': ['never', { ignoreProperties: ['/^--/'] }],
    'declaration-property-value-disallowed-list': {
      '/^(?!--)/': [
        '/#[0-9a-f]{3,8}\\b/i',
        '/\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\(/i',
      ],
    },
  },
}
