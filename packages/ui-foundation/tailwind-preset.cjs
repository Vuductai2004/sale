module.exports = {
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--ui-canvas) / <alpha-value>)',
        surface: 'rgb(var(--ui-surface) / <alpha-value>)',
        ink: 'rgb(var(--ui-ink) / <alpha-value>)',
        muted: 'rgb(var(--ui-muted) / <alpha-value>)',
        line: 'rgb(var(--ui-line) / <alpha-value>)',
        primary: 'rgb(var(--ui-primary) / <alpha-value>)',
        'primary-ink': 'rgb(var(--ui-primary-ink) / <alpha-value>)',
        success: 'rgb(var(--ui-success) / <alpha-value>)',
        warning: 'rgb(var(--ui-warning) / <alpha-value>)',
        danger: 'rgb(var(--ui-danger) / <alpha-value>)',
        info: 'rgb(var(--ui-info) / <alpha-value>)',
        demo: 'rgb(var(--ui-demo) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--ui-radius-sm)',
        md: 'var(--ui-radius-md)',
        lg: 'var(--ui-radius-lg)',
      },
      boxShadow: {
        sm: 'var(--ui-shadow-sm)',
        md: 'var(--ui-shadow-md)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        sidebar: 'var(--ag-sidebar-width)',
        topbar: 'var(--ag-topbar-height)',
      },
    },
  },
};
