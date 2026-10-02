/* @ds-bundle: {"format":4,"namespace":"SlateNFrameDesignSystem_fc0212","components":[{"name":"ServiceCard","sourcePath":"components/cards/ServiceCard.jsx"},{"name":"WorkCard","sourcePath":"components/cards/WorkCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"GlassPanel","sourcePath":"components/core/GlassPanel.jsx"},{"name":"Link","sourcePath":"components/core/Link.jsx"},{"name":"SectionHeader","sourcePath":"components/core/SectionHeader.jsx"},{"name":"FormField","sourcePath":"components/forms/FormField.jsx"},{"name":"AnimatedIcon","sourcePath":"components/icons/AnimatedIcon.jsx"},{"name":"Footer","sourcePath":"components/navigation/Footer.jsx"},{"name":"NavHeader","sourcePath":"components/navigation/NavHeader.jsx"}],"sourceHashes":{"components/cards/ServiceCard.jsx":"043af4c1240f","components/cards/WorkCard.jsx":"ada82847cac9","components/core/Badge.jsx":"3ed2c2a8e72e","components/core/Button.jsx":"b07c4ffff9c2","components/core/GlassPanel.jsx":"89b4e55d4b41","components/core/Link.jsx":"c51a7a79c192","components/core/SectionHeader.jsx":"8bb8ad65d071","components/forms/FormField.jsx":"20471169b8e1","components/icons/AnimatedIcon.jsx":"38e1ffb1928a","components/navigation/Footer.jsx":"8509d2fcf220","components/navigation/NavHeader.jsx":"65493069276e","ui_kits/slides/Slides.jsx":"c3368e31f931","ui_kits/website/Home.jsx":"cfd59268c407","ui_kits/website/Home.v1.jsx":"61b38667f0aa"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SlateNFrameDesignSystem_fc0212 = window.SlateNFrameDesignSystem_fc0212 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function Badge({
  children,
  variant = 'outline',
  className,
  style
}) {
  const variants = {
    outline: {
      background: 'transparent',
      border: '1px solid var(--border-on-dark)',
      color: 'var(--text-on-dark-secondary)'
    },
    accent: {
      background: 'rgba(234, 105, 58, 0.14)',
      border: '1px solid var(--accent)',
      color: 'var(--accent)'
    },
    solid: {
      background: 'var(--off-white-90)',
      border: '1px solid var(--off-white-90)',
      color: 'var(--charcoal-900)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    className: ['snf-badge', className].filter(Boolean).join(' '),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--label-size)',
      fontWeight: 'var(--weight-medium)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      padding: '0.4rem 0.9rem',
      borderRadius: 'var(--radius-pill)',
      ...variants[variant],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/cards/WorkCard.jsx
try { (() => {
function WorkCard({
  title,
  client,
  tags = [],
  thumbnail,
  year,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['snf-work-card', className].filter(Boolean).join(' '),
    style: {
      position: 'relative',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      aspectRatio: '4 / 5',
      background: thumbnail ? `center/cover no-repeat url(${thumbnail})` : 'var(--charcoal-800)',
      cursor: 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(28,26,27,0) 40%, rgba(28,26,27,0.88) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'var(--space-5)',
      left: 'var(--space-5)',
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    }
  }, tags.map(t => /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    key: t,
    variant: "outline",
    style: {
      background: 'rgba(28,26,27,0.5)',
      backdropFilter: 'blur(4px)'
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 'var(--space-5)',
      left: 'var(--space-5)',
      right: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      color: 'var(--text-on-dark-secondary)',
      marginBottom: '4px'
    }
  }, client, year ? ` — ${year}` : ''), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--h5-size)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark)',
      margin: 0
    }
  }, title)));
}
Object.assign(__ds_scope, { WorkCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/WorkCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const PAD = {
  sm: '0.55rem 1.1rem',
  md: '0.85rem 1.75rem',
  lg: '1.05rem 2.25rem'
};
const FONT_SIZE = {
  sm: 'var(--label-size)',
  md: '0.9375rem',
  lg: 'var(--body-size)'
};
function Button({
  children,
  variant = 'primary',
  // primary | secondary | ghost
  size = 'md',
  onClick,
  href,
  disabled = false,
  icon = null,
  type = 'button',
  className,
  style
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    fontSize: FONT_SIZE[size],
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase',
    padding: PAD[size],
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard), transform var(--dur-instant) var(--ease-standard)`,
    textDecoration: 'none',
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    ...style
  };
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--charcoal-900)',
      borderColor: 'var(--accent)'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--text-on-dark)',
      borderColor: 'var(--border-on-dark-strong)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-on-dark)',
      borderColor: 'transparent',
      padding: PAD[size].split(' ')[0] + ' 0.25rem'
    }
  };
  const Tag = href ? 'a' : 'button';
  const stateClass = `snf-btn snf-btn-${variant}`;
  return /*#__PURE__*/React.createElement(Tag, {
    href: href,
    type: href ? undefined : type,
    onClick: onClick,
    disabled: href ? undefined : disabled,
    className: [stateClass, className].filter(Boolean).join(' '),
    style: {
      ...base,
      ...variants[variant]
    }
  }, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/GlassPanel.jsx
try { (() => {
/**
 * A frosted "liquid glass" surface — floating nav chrome, modal/lightbox
 * backing, or a badge sitting over video/imagery. Sparing use only: this is
 * a UI-chrome treatment, not a section background.
 */
function GlassPanel({
  children,
  radius = 'lg',
  padding = 'var(--space-6)',
  className,
  style
}) {
  const radiusVar = {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    pill: 'var(--radius-pill)'
  }[radius] || radius;
  return /*#__PURE__*/React.createElement("div", {
    className: ['snf-glass', className].filter(Boolean).join(' '),
    style: {
      borderRadius: radiusVar,
      padding,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { GlassPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/GlassPanel.jsx", error: String((e && e.message) || e) }); }

// components/core/Link.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Link({
  children,
  href = '#',
  variant = 'inline',
  className,
  style,
  ...rest
}) {
  const base = {
    color: variant === 'inverse' ? 'var(--text-on-light)' : 'var(--text-on-dark)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-medium)',
    textDecoration: 'none',
    backgroundImage: 'linear-gradient(currentColor, currentColor)',
    backgroundSize: '0% 1px',
    backgroundPosition: '0 100%',
    backgroundRepeat: 'no-repeat',
    paddingBottom: '2px',
    transition: 'background-size var(--dur-base) var(--ease-out), color var(--dur-fast) var(--ease-standard)',
    ...style
  };
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    className: ['snf-link', className].filter(Boolean).join(' '),
    style: base
  }, rest), children);
}
Object.assign(__ds_scope, { Link });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Link.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormField.jsx
try { (() => {
function FormField({
  label,
  type = 'text',
  // text | email | tel | textarea
  placeholder,
  value,
  onChange,
  state = 'default',
  // default | focus | error | success
  helperText,
  name,
  className,
  style
}) {
  const borderColor = {
    default: 'var(--border-on-dark)',
    focus: 'var(--accent)',
    error: 'var(--state-error)',
    success: 'var(--state-success-border)'
  }[state];
  const fieldStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${borderColor}`,
    borderRadius: 0,
    padding: '0.75rem 0.1rem',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--body-size)',
    color: 'var(--text-on-dark)',
    outline: 'none',
    transition: 'border-color var(--dur-fast) var(--ease-standard)'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: ['snf-field', className].filter(Boolean).join(' '),
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: name,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--label-size)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark-secondary)'
    }
  }, label), type === 'textarea' ? /*#__PURE__*/React.createElement("textarea", {
    id: name,
    name: name,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    rows: 4,
    style: {
      ...fieldStyle,
      resize: 'vertical'
    }
  }) : /*#__PURE__*/React.createElement("input", {
    id: name,
    name: name,
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    style: fieldStyle
  }), helperText && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      color: state === 'error' ? 'var(--state-error)' : 'var(--text-on-dark-muted)'
    }
  }, helperText));
}
Object.assign(__ds_scope, { FormField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormField.jsx", error: String((e && e.message) || e) }); }

// components/icons/AnimatedIcon.jsx
try { (() => {
/**
 * The 6 Slate n' Frame icon motifs, always animated. Source art lives in
 * assets/icons/*.png (off-white silhouettes on transparent). To recolor
 * without a fragile CSS mask (which some render/export pipelines flatten to a
 * solid box), we ship pre-tinted variants — <icon>-<color>.png — and render a
 * real <img>, so icons survive screenshots, PDF and PPTX export intact.
 */
const NAMES = ['aperture', 'lens', 'motion', 'pulse', 'light', 'capture'];
const COLOR_KEY = {
  'off-white': 'off-white',
  charcoal: 'charcoal',
  rust: 'rust'
};
function iconSrc(name, color) {
  const key = COLOR_KEY[color] || 'off-white';
  return `../../assets/icons/${name}-${key}.png`;
}
const SIZE_PX = {
  sm: 28,
  md: 48,
  lg: 96,
  xl: 180,
  hero: 340
};

/* Per-icon animation spec — see AnimatedIcon.prompt.md for full rationale. */
function animationFor(name, speed) {
  const dur = {
    fast: 'var(--dur-icon-loop-fast)',
    base: 'var(--dur-icon-loop-base)',
    slow: 'var(--dur-icon-loop-slow)'
  }[speed] || 'var(--dur-icon-loop-base)';
  switch (name) {
    case 'aperture':
      // Iris breathes: slow rotation + subtle scale pulse, like a lens hunting focus.
      return {
        animation: `snf-spin ${dur} linear infinite, snf-breathe var(--dur-icon-loop-fast) var(--ease-in-out) infinite`
      };
    case 'lens':
      // Concentric rings drift outward in a slow, continuous rotation.
      return {
        animation: `snf-spin-slow ${dur} linear infinite`
      };
    case 'motion':
      // Stacked ellipses drift vertically in a gentle coil, offset per layer via child spans.
      return {
        animation: `snf-drift var(--dur-icon-loop-fast) var(--ease-in-out) infinite`
      };
    case 'pulse':
      // Sound-wave bars: rhythmic scale pulse on the Y axis.
      return {
        animation: `snf-pulse-scale 1.8s var(--ease-in-out) infinite`
      };
    case 'light':
      // Sunburst: slow constant rotation, like a light source sweeping.
      return {
        animation: `snf-spin-slow ${dur} linear infinite`
      };
    case 'capture':
      // Pinwheel: shutter-snap rotation — quick snap then hold, like a shutter cycling.
      return {
        animation: `snf-shutter 3.2s var(--ease-shutter) infinite`
      };
    default:
      return {};
  }
}
function AnimatedIcon({
  name,
  size = 'md',
  color = 'off-white',
  speed = 'base',
  reactToScroll = false,
  className,
  style
}) {
  const px = typeof size === 'number' ? size : SIZE_PX[size] || SIZE_PX.md;
  if (!NAMES.includes(name)) return null;
  const src = iconSrc(name, color);
  const wrapStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: px,
    height: px,
    flexShrink: 0,
    ...style
  };
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transformOrigin: '50% 50%',
    willChange: 'transform',
    ...animationFor(name, speed)
  };
  return /*#__PURE__*/React.createElement("span", {
    className: ['snf-icon', reactToScroll ? 'snf-icon-scroll' : '', className].filter(Boolean).join(' '),
    "data-icon": name,
    style: wrapStyle
  }, /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: `${name} icon`,
    draggable: false,
    style: imgStyle
  }));
}
Object.assign(__ds_scope, { AnimatedIcon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icons/AnimatedIcon.jsx", error: String((e && e.message) || e) }); }

// components/cards/ServiceCard.jsx
try { (() => {
function ServiceCard({
  icon = 'aperture',
  title,
  description,
  index,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['snf-service-card', className].filter(Boolean).join(' '),
    style: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-on-dark-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-8) var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
      transition: `border-color var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-out), background-color var(--dur-base) var(--ease-standard)`,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.AnimatedIcon, {
    name: icon,
    size: "lg",
    color: "off-white",
    reactToScroll: true
  }), index != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      color: 'var(--text-on-dark-muted)'
    }
  }, String(index).padStart(2, '0'))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--h4-size)',
      lineHeight: 'var(--h4-line)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark)',
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-light)',
      fontSize: 'var(--body-sm-size)',
      lineHeight: 'var(--body-sm-line)',
      color: 'var(--text-on-dark-secondary)',
      margin: 0
    }
  }, description));
}
Object.assign(__ds_scope, { ServiceCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/ServiceCard.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionHeader.jsx
try { (() => {
function SectionHeader({
  eyebrow,
  title,
  description,
  icon,
  align = 'left',
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ['snf-section-header', className].filter(Boolean).join(' '),
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      textAlign: align,
      gap: 'var(--space-5)',
      maxWidth: 720,
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.AnimatedIcon, {
    name: icon,
    size: "md",
    color: "rust"
  }), eyebrow && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: "outline"
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--h2-size)',
      lineHeight: 'var(--h2-line)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark)',
      margin: 0
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-light)',
      fontSize: 'var(--body-lg-size)',
      lineHeight: 'var(--body-lg-line)',
      color: 'var(--text-on-dark-secondary)',
      margin: 0
    }
  }, description));
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Footer.jsx
try { (() => {
function Footer({
  logo = '../../assets/logo/logo-off-white.png',
  address = 'Beograd, Srbija',
  email = 'hello@slatenframe.rs',
  links = [{
    label: 'Usluge',
    href: '#services'
  }, {
    label: 'Radovi',
    href: '#work'
  }, {
    label: 'O nama',
    href: '#about'
  }, {
    label: 'Kontakt',
    href: '#contact'
  }],
  social = ['Instagram', 'LinkedIn', 'Vimeo'],
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: ['snf-footer', className].filter(Boolean).join(' '),
    style: {
      background: 'var(--charcoal-950)',
      padding: 'var(--space-11) var(--section-pad-x) var(--space-6)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-9)',
      justifyContent: 'space-between',
      paddingBottom: 'var(--space-9)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      maxWidth: 320
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: "Slate n' Frame",
    style: {
      height: 32,
      width: 'auto'
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-light)',
      fontSize: 'var(--body-sm-size)',
      color: 'var(--text-on-dark-secondary)',
      margin: 0
    }
  }, "Video koji se gleda do kraja.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark-muted)'
    }
  }, "Navigacija"), links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.label,
    href: l.href,
    style: {
      fontFamily: 'var(--font-body)',
      color: 'var(--text-on-dark)',
      textDecoration: 'none',
      fontSize: 'var(--body-sm-size)'
    }
  }, l.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark-muted)'
    }
  }, "Kontakt"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      color: 'var(--text-on-dark)',
      fontSize: 'var(--body-sm-size)'
    }
  }, email), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      color: 'var(--text-on-dark-secondary)',
      fontSize: 'var(--body-sm-size)'
    }
  }, address)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark-muted)'
    }
  }, "Pratite nas"), social.map(s => /*#__PURE__*/React.createElement("a", {
    key: s,
    href: "#",
    style: {
      fontFamily: 'var(--font-body)',
      color: 'var(--text-on-dark)',
      textDecoration: 'none',
      fontSize: 'var(--body-sm-size)'
    }
  }, s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-on-dark-subtle)',
      paddingTop: 'var(--space-5)',
      display: 'flex',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      color: 'var(--text-on-dark-muted)'
    }
  }, "\xA9 ", new Date().getFullYear(), " Slate n' Frame"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      color: 'var(--text-on-dark-muted)'
    }
  }, "Studio za video produkciju & dru\u0161tvene mre\u017Ee")));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavHeader.jsx
try { (() => {
const {
  useState
} = React;
function NavHeader({
  logo = '../../assets/logo/logo-off-white.png',
  links = [{
    label: 'Usluge',
    href: '#services'
  }, {
    label: 'Radovi',
    href: '#work'
  }, {
    label: 'O nama',
    href: '#about'
  }, {
    label: 'Kontakt',
    href: '#contact'
  }],
  lang = 'SR',
  onToggleLang,
  className,
  style
}) {
  const [open, setOpen] = useState(false);
  return /*#__PURE__*/React.createElement("header", {
    className: ['snf-nav', className].filter(Boolean).join(' '),
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-5) var(--section-pad-x)',
      background: 'rgba(47,45,46,0.72)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-on-dark-subtle)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: "Slate n' Frame",
    style: {
      height: 28,
      width: 'auto'
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 'var(--space-7)'
    },
    className: "snf-nav-links"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.label,
    href: l.href,
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--label-size)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-on-dark)',
      textDecoration: 'none'
    }
  }, l.label))), /*#__PURE__*/React.createElement("button", {
    onClick: onToggleLang,
    "aria-label": "Toggle language",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'transparent',
      border: '1px solid var(--border-on-dark)',
      borderRadius: 'var(--radius-pill)',
      padding: '0.4rem 0.9rem',
      color: 'var(--text-on-dark)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--caption-size)',
      fontWeight: 'var(--weight-medium)',
      cursor: 'pointer',
      letterSpacing: 'var(--tracking-label)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: lang === 'SR' ? 'var(--accent)' : 'inherit'
    }
  }, "SR"), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.4
    }
  }, "/"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: lang === 'EN' ? 'var(--accent)' : 'inherit'
    }
  }, "EN")));
}
Object.assign(__ds_scope, { NavHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/slides/Slides.jsx
try { (() => {
/* Slate n' Frame — Pitch deck slide kit.
   Rebuilds the client's pitch deck aesthetic (grain + rust radial glow +
   liquid-glass cards over gritty B&W footage) on the FINAL brand system:
   Uni Neue Black (→ Archivo Black) display, DM Sans body. The original deck
   used a placeholder serif for the quote slide (made before fonts were
   chosen) — replaced here with DM Sans Light, which is the on-system choice. */

const {
  AnimatedIcon
} = window.SlateNFrameDesignSystem_fc0212;
const DECK_BG = '#131211';
const IMG = '../../assets/imagery/gritty-bw-sample-01.png';
const label = {
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  fontSize: '15px'
};
function Frame({
  index,
  total = 10,
  children,
  image,
  dark
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "snf-grain snf-grain-strong",
    style: {
      position: 'relative',
      width: 1920,
      height: 1080,
      background: DECK_BG,
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
      color: 'var(--off-white-90)'
    }
  }, image && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
    src: IMG,
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      filter: 'grayscale(1) contrast(1.05) brightness(0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(19,18,17,0.55) 0%, rgba(19,18,17,0.35) 45%, rgba(19,18,17,0.8) 100%)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      left: 88,
      right: 88,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      letterSpacing: '0.1em',
      fontSize: '17px'
    }
  }, "SLATE N' FRAME"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--text-on-dark-muted)',
      fontSize: '17px'
    }
  }, String(index).padStart(2, '0'), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.5
    }
  }, "/"), " ", total)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 5,
      width: '100%',
      height: '100%'
    }
  }, children));
}
const Glow = ({
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    width: 900,
    height: 900,
    background: 'radial-gradient(closest-side, rgba(234,105,58,0.5), rgba(234,105,58,0.12) 45%, rgba(234,105,58,0) 72%)',
    filter: 'blur(8px)',
    pointerEvents: 'none',
    ...style
  }
});
const display = (size, line = 0.92) => ({
  fontFamily: 'var(--font-display)',
  textTransform: 'uppercase',
  fontSize: size,
  lineHeight: line,
  letterSpacing: '0.01em',
  margin: 0
});

/* ---------- 01 · TITLE ---------- */
function TitleSlide() {
  return /*#__PURE__*/React.createElement(Frame, {
    index: 1
  }, /*#__PURE__*/React.createElement(Glow, {
    style: {
      top: 90,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 1050,
      height: 1050
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--text-on-dark-secondary)',
      marginBottom: 40
    }
  }, "Predlog saradnje"), /*#__PURE__*/React.createElement("h1", {
    style: {
      ...display('150px', 0.9),
      maxWidth: 1300,
      textShadow: '0 4px 30px rgba(0,0,0,0.5)'
    }
  }, "Video koji se gleda ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "do kraja"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 64,
      left: 88,
      right: 88,
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, [['— Produkcija', "Slate n' Frame"], ['Tema', 'Mesečna video produkcija'], ['Klijent —', 'Berić satovi i nakit']].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: i === 1 ? 'center' : i === 2 ? 'right' : 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...label,
      color: 'var(--accent)',
      fontSize: '13px',
      marginBottom: 10
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      ...label,
      fontSize: '17px',
      letterSpacing: '0.08em'
    }
  }, v)))));
}

/* ---------- 02 · PROBLEM ---------- */
function ProblemSlide() {
  const items = [['01', 'Video koji se gleda do kraja', 'Ljudi koji kupuju satove ne traže katalog, traže priču koja im opravdava kupovinu.'], ['02', 'TikTok kao zaseban kanal', 'Generacija 25–35 sve češće odluku o kupovini donosi na TikToku, ne na Google-u.'], ['03', 'Ljudski momenat brenda', 'Maturski poklon, godišnjica, prvi sat za sebe. Kontekst pre proizvoda.'], ['04', 'Kako se bira sat', 'Sadržaj koji gradi poverenje pre nego što klijent kroči u radnju.']];
  return /*#__PURE__*/React.createElement(Frame, {
    index: 2
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      padding: '210px 88px 88px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--accent)'
    }
  }, "Trenutno stanje"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('82px'),
      marginTop: 24
    }
  }, "\u010Cetiri rupe u ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "komunikaciji."))), /*#__PURE__*/React.createElement("p", {
    style: {
      position: 'absolute',
      top: 250,
      right: 88,
      width: 520,
      fontWeight: 300,
      fontSize: '21px',
      lineHeight: 1.55,
      color: 'var(--text-on-dark-secondary)'
    }
  }, "Profil radi za feed, ne za retenciju. TikTok je cross-post sa Instagrama. Storytelling i ljudski momenat nedostaju."), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 88,
      right: 88,
      bottom: 120,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '64px 120px'
    }
  }, items.map(([n, t, d]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...display('44px'),
      color: 'var(--accent)',
      flexShrink: 0
    }
  }, n), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      ...display('26px', 1.1),
      marginBottom: 14
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontWeight: 300,
      fontSize: '18px',
      lineHeight: 1.5,
      color: 'var(--text-on-dark-secondary)',
      margin: 0
    }
  }, d)))))));
}

/* ---------- 03 · QUOTE ---------- */
function QuoteSlide() {
  return /*#__PURE__*/React.createElement(Frame, {
    index: 3
  }, /*#__PURE__*/React.createElement(Glow, {
    style: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 1100,
      height: 1100
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '0 260px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--text-on-dark-secondary)',
      marginBottom: 48
    }
  }, "Glavna poruka"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: '68px',
      lineHeight: 1.28,
      letterSpacing: '-0.01em',
      margin: 0
    }
  }, "\u201CPravimo video sadr\u017Eaj koji se gleda ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)',
      fontWeight: 400
    }
  }, "do kraja"), ", optimizovan za platformu na kojoj se objavljuje.\u201D")));
}

/* ---------- 04 · PILLARS ---------- */
function PillarsSlide() {
  const cols = [['01 - Brend', 'pulse', 'Brend\nkao priča', 'Video koji gradi prepoznatljivost, ton i emociju oko Berić identiteta.', 'Cinematic · Atmosphere · Slow'], ['02 - Edukacija', 'lens', 'Edukacija\nkao autoritet', 'Reels i TikTok videi koji uče publiku o satovima i nakitu.', 'Breakdown · Quick tip · Expert'], ['03 - Dve mreže', 'motion', 'Dve mreže\ndva pristupa', 'Različit ton i format za Instagram i TikTok. Ne kačimo isti video na obe.', 'IG aspirational · TT direct']];
  return /*#__PURE__*/React.createElement(Frame, {
    index: 4
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      padding: '210px 88px 88px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--accent)'
    }
  }, "Content pillars"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('76px'),
      marginTop: 24
    }
  }, "Na \u010Demu gradimo ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "saradnju."))), /*#__PURE__*/React.createElement("p", {
    style: {
      position: 'absolute',
      top: 250,
      right: 88,
      width: 520,
      fontWeight: 300,
      fontSize: '20px',
      lineHeight: 1.55,
      color: 'var(--text-on-dark-secondary)'
    }
  }, "Fokus je usko na video. Sav rad usmeren je u jedan smer: video koji ljudi gledaju do kraja."), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 88,
      right: 88,
      bottom: 110,
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 90
    }
  }, cols.map(([eyebrow, icon, title, body, tags]) => /*#__PURE__*/React.createElement("div", {
    key: eyebrow
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--accent)',
      fontSize: '13px'
    }
  }, eyebrow), /*#__PURE__*/React.createElement(AnimatedIcon, {
    name: icon,
    size: 46,
    color: "off-white",
    reactToScroll: true
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      ...display('34px', 1.05),
      whiteSpace: 'pre-line',
      marginBottom: 28
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontWeight: 300,
      fontSize: '19px',
      lineHeight: 1.5,
      color: 'var(--text-on-dark-secondary)',
      marginBottom: 28
    }
  }, body), /*#__PURE__*/React.createElement("div", {
    style: {
      ...label,
      color: 'var(--accent)',
      fontSize: '13px',
      letterSpacing: '0.14em'
    }
  }, tags))))));
}

/* ---------- 05 · PROCESS ---------- */
function ProcessSlide() {
  const steps = [['01', 'Brif i\nkoncept', 'Razgovor o ciljevima i tonu za naredni mesec.'], ['02', 'Plan\nsnimanja', 'Konkretne ideje za sve videe meseca, sa skriptama.'], ['03', 'Dva\ntermina', 'Termin 1 sa licem brenda. Termin 2 u studiju.'], ['04', 'Montaža\ni isporuka', 'Postprodukcija odvojeno za Instagram i TikTok.'], ['05', 'Sledeći\nciklus', 'Na osnovu performansi prilagođavamo plan.']];
  return /*#__PURE__*/React.createElement(Frame, {
    index: 5
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      padding: '210px 88px 88px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--accent)'
    }
  }, "Content types"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('76px'),
      marginTop: 24
    }
  }, "Pet koraka ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "svaki mesec."))), /*#__PURE__*/React.createElement("p", {
    style: {
      position: 'absolute',
      top: 250,
      right: 88,
      width: 500,
      fontWeight: 300,
      fontSize: '20px',
      lineHeight: 1.55,
      color: 'var(--text-on-dark-secondary)'
    }
  }, "Tipologija po kojoj pravimo mese\u010Dni plan. Svaki format ima publiku, du\u017Einu i mre\u017Eu za koju je optimizovan."), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 88,
      right: 88,
      bottom: 120,
      display: 'grid',
      gridTemplateColumns: 'repeat(5,1fr)',
      gap: 56
    }
  }, steps.map(([n, t, d]) => /*#__PURE__*/React.createElement("div", {
    key: n
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...display('92px'),
      color: 'var(--accent)',
      marginBottom: 18
    }
  }, n), /*#__PURE__*/React.createElement("h3", {
    style: {
      ...display('27px', 1.05),
      whiteSpace: 'pre-line',
      marginBottom: 20
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontWeight: 300,
      fontSize: '17px',
      lineHeight: 1.5,
      color: 'var(--text-on-dark-secondary)',
      margin: 0
    }
  }, d))))));
}

/* ---------- 06 · SECTION DIVIDER (footage) ---------- */
function DividerSlide() {
  return /*#__PURE__*/React.createElement(Frame, {
    index: 6,
    image: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      transform: 'translateY(-50%)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...label,
      color: 'var(--text-on-dark-secondary)',
      marginBottom: 34
    }
  }, "References"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...display('122px', 1.02),
      textShadow: '0 6px 40px rgba(0,0,0,0.6)'
    }
  }, "\u0160ta smo"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...display('122px', 1.02),
      color: 'var(--accent)',
      textShadow: '0 6px 40px rgba(0,0,0,0.6)'
    }
  }, "radili?")), /*#__PURE__*/React.createElement("p", {
    style: {
      position: 'absolute',
      top: '76%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 640,
      textAlign: 'center',
      fontWeight: 300,
      fontSize: '21px',
      lineHeight: 1.5,
      color: 'var(--text-on-dark-secondary)',
      margin: 0
    }
  }, "Izbor projekata iz portfolija Slate n' Frame studija \u2014 kratke forme, brand filmovi, retail kampanje."));
}

/* ---------- 09 · PRICING (glass cards over footage) ---------- */
function PricingSlide() {
  const rows = a => [['Mreže', a ? 'Instagram ili TikTok' : 'Instagram i TikTok'], ['Broj videa', a ? '8' : '14'], ['Termini snimanja', a ? '1 + 1 (lice + produkt)' : '2 + 1 (lice + produkt)'], ['Pregled performansa', a ? 'Nije uključeno' : 'Kratak pregled po mreži'], ['Skripte i koncepti', a ? 'Za izabranu platformu' : 'Odvojeno za svaku mrežu']];
  const Card = ({
    tag,
    right,
    name,
    price,
    accent,
    rowsData
  }) => /*#__PURE__*/React.createElement("div", {
    className: "snf-glass",
    style: {
      flex: 1,
      borderRadius: 'var(--radius-lg)',
      padding: '52px 56px',
      background: accent ? 'rgba(234,105,58,0.14)' : 'var(--glass-bg)',
      borderColor: accent ? 'rgba(234,105,58,0.5)' : 'var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 60
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: accent ? 'var(--accent)' : 'var(--text-on-dark-secondary)',
      fontSize: '15px'
    }
  }, tag), /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: accent ? 'var(--accent)' : 'var(--text-on-dark-secondary)',
      fontSize: '15px'
    }
  }, right)), /*#__PURE__*/React.createElement("h3", {
    style: {
      ...display('44px', 1.05),
      whiteSpace: 'pre-line',
      marginBottom: 24
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 14,
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...display('96px'),
      color: accent ? 'var(--accent)' : 'var(--off-white-90)'
    }
  }, price), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '26px',
      fontWeight: 400
    }
  }, "\u20AC/mes")), rowsData.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '13px 0',
      borderTop: '1px solid var(--border-on-dark-subtle)',
      fontSize: '17px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-on-dark-secondary)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--off-white-90)'
    }
  }, v))));
  return /*#__PURE__*/React.createElement(Frame, {
    index: 9,
    image: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      padding: '190px 88px 96px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--accent)'
    }
  }, "Saradnja"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('72px'),
      marginTop: 22
    }
  }, "Dva nivoa ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "saradnje."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 44,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tag: "Paket A",
    right: "Jedna mre\u017Ea",
    name: 'Single\nplatform',
    price: "700",
    rowsData: rows(true)
  }), /*#__PURE__*/React.createElement(Card, {
    tag: "Paket B",
    right: "Instagram + TikTok",
    name: 'Dual\nplatform',
    price: "1200",
    accent: true,
    rowsData: rows(false)
  }))));
}

/* ---------- 10 · CLOSING (footage) ---------- */
function ClosingSlide() {
  return /*#__PURE__*/React.createElement(Frame, {
    index: 10,
    image: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('132px', 0.98),
      maxWidth: 1500,
      textShadow: '0 6px 40px rgba(0,0,0,0.6)'
    }
  }, "Spremni smo da krenemo, ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "a vi?")), /*#__PURE__*/React.createElement("span", {
    style: {
      ...label,
      color: 'var(--text-on-dark-secondary)',
      marginTop: 72,
      marginBottom: 20
    }
  }, "Kontakt"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:hello@slatenframe.com",
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: '30px',
      color: 'var(--off-white-90)',
      textDecoration: 'none'
    }
  }, "hello@slatenframe.com")));
}
const SLIDES = [TitleSlide, ProblemSlide, QuoteSlide, PillarsSlide, ProcessSlide, DividerSlide, PricingSlide, ClosingSlide];
Object.assign(window, {
  SNF_SLIDES: SLIDES,
  TitleSlide,
  ProblemSlide,
  QuoteSlide,
  PillarsSlide,
  ProcessSlide,
  DividerSlide,
  PricingSlide,
  ClosingSlide,
  DeckFrame: Frame
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/slides/Slides.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.jsx
try { (() => {
const {
  NavHeader,
  Footer,
  Button,
  AnimatedIcon
} = window.SlateNFrameDesignSystem_fc0212;
const IMG = '../../assets/imagery/gritty-bw-sample-01.png';
const COPY = {
  SR: {
    nav: [{
      label: 'Radovi',
      href: '#work'
    }, {
      label: 'Usluge',
      href: '#capabilities'
    }, {
      label: 'O nama',
      href: '#intro'
    }, {
      label: 'Kontakt',
      href: '#contact'
    }],
    playReel: 'Pusti ril',
    scroll: 'Skrolujte za više',
    statement: 'Video koji se gleda do kraja.',
    statementCta: 'Radite sa nama',
    introEyebrow: 'Studio',
    intro: "Slate n' Frame je studio za video produkciju i društvene mreže. Strategija, snimanje, montaža i plasman sadržaja koji zadržava pažnju — od prve do poslednje sekunde.",
    introCta: 'Saznaj više',
    workEyebrow: 'Najnoviji radovi',
    workTitle: 'Odabrani projekti',
    workAll: 'Vidi sve',
    work: [{
      t: 'Brand film',
      s: 'Kratka forma · Cinematic',
      tag: '01'
    }, {
      t: 'Reels kampanja',
      s: 'Instagram · TikTok',
      tag: '02'
    }, {
      t: 'Dokumentarac',
      s: 'Duga forma',
      tag: '03'
    }, {
      t: 'TVC reklama',
      s: 'Broadcast',
      tag: '04'
    }, {
      t: 'Event aftermovie',
      s: 'Recap',
      tag: '05'
    }, {
      t: 'Proizvod',
      s: 'Studio · Product',
      tag: '06'
    }],
    clientsEyebrow: 'Poverenje',
    clientsTitle: 'Sa kim radimo',
    clientsNote: 'Vaš logotip ovde — dodajte klijente kada budu spremni za prikaz.',
    capEyebrow: 'Usluge',
    capTitle: 'Šta radimo',
    caps: [{
      label: 'Video produkcija',
      desc: 'Koncept, scenario, snimanje i finalni kadar — cela produkcija na jednom mestu.'
    }, {
      label: 'Društvene mreže',
      desc: 'Strategija, kalendar objava i svakodnevno vođenje profila.'
    }, {
      label: 'Montaža i post',
      desc: 'Ritam, kolor, zvuk i grafika koji drže pažnju do poslednje sekunde.'
    }, {
      label: 'Brendiranje',
      desc: 'Vizuelni identitet koji izgleda isto dobro na svakoj platformi.'
    }, {
      label: 'Strategija',
      desc: 'Plan koji svaki kadar usmerava ka jednom jasnom cilju.'
    }],
    signEyebrow: 'Vizuelni jezik',
    signTitle: 'Šest znakova, jedan potpis',
    signBody: 'Šest animiranih znakova čine vizuelni potpis studija. Svaki je uvek u pokretu.',
    signNames: ['Aperture', 'Objektiv', 'Pokret', 'Ritam', 'Svetlo', 'Kadar'],
    closing: 'Spremni smo da krenemo, a vi?',
    closingCta: 'Započni projekat',
    contactEyebrow: 'Kontakt',
    contactTitle: 'Popričajmo',
    contactBody: 'Pošaljite par rečenica o tome šta snimate — javljamo se u roku od 24h.',
    email: 'hello@slatenframe.com'
  },
  EN: {
    nav: [{
      label: 'Work',
      href: '#work'
    }, {
      label: 'Services',
      href: '#capabilities'
    }, {
      label: 'About',
      href: '#intro'
    }, {
      label: 'Contact',
      href: '#contact'
    }],
    playReel: 'Play reel',
    scroll: 'Scroll to view more',
    statement: 'Videos you watch till the end.',
    statementCta: 'Work with us',
    introEyebrow: 'Studio',
    intro: "Slate n' Frame is a studio for video production and social media. Strategy, shooting, editing and distribution of content that holds attention — from the first second to the last.",
    introCta: 'Learn more',
    workEyebrow: 'Latest work',
    workTitle: 'Selected projects',
    workAll: 'View all',
    work: [{
      t: 'Brand film',
      s: 'Short form · Cinematic',
      tag: '01'
    }, {
      t: 'Reels campaign',
      s: 'Instagram · TikTok',
      tag: '02'
    }, {
      t: 'Documentary',
      s: 'Long form',
      tag: '03'
    }, {
      t: 'TV commercial',
      s: 'Broadcast',
      tag: '04'
    }, {
      t: 'Event aftermovie',
      s: 'Recap',
      tag: '05'
    }, {
      t: 'Product',
      s: 'Studio · Product',
      tag: '06'
    }],
    clientsEyebrow: 'Trusted by',
    clientsTitle: 'Who we work with',
    clientsNote: 'Your logo here — add clients once they are ready to show.',
    capEyebrow: 'Services',
    capTitle: 'What we do',
    caps: [{
      label: 'Video production',
      desc: 'Concept, script, shoot and final cut — the whole production in one place.'
    }, {
      label: 'Social media',
      desc: 'Strategy, content calendar and daily account management.'
    }, {
      label: 'Editing & post',
      desc: 'Rhythm, color, sound and graphics that hold attention till the last second.'
    }, {
      label: 'Branding',
      desc: 'A visual identity that looks just as good on every platform.'
    }, {
      label: 'Strategy',
      desc: 'A plan that points every frame toward one clear goal.'
    }],
    signEyebrow: 'Visual language',
    signTitle: 'Six marks, one signature',
    signBody: "Six animated marks form the studio's visual signature. Each one is always moving.",
    signNames: ['Aperture', 'Lens', 'Motion', 'Rhythm', 'Light', 'Frame'],
    closing: "We're ready to roll, are you?",
    closingCta: 'Start a project',
    contactEyebrow: 'Contact',
    contactTitle: "Let's talk",
    contactBody: 'Send a few lines about what you are shooting — we reply within 24h.',
    email: 'hello@slatenframe.com'
  }
};

/* ---------- helpers ---------- */
const display = (size, line = 0.92) => ({
  fontFamily: 'var(--font-display)',
  textTransform: 'uppercase',
  fontSize: size,
  lineHeight: line,
  letterSpacing: '0.01em',
  margin: 0
});
const eyebrow = {
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  fontSize: '13px',
  color: 'var(--accent)'
};
const PlayGlyph = () => /*#__PURE__*/React.createElement("span", {
  style: {
    display: 'inline-block',
    width: 0,
    height: 0,
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderLeft: '10px solid currentColor',
    marginLeft: 2
  }
});

/* The 6 brand marks, decoupled from any service — shown as the studio's
   visual signature. A rust highlight travels across the set on a loop. */
const SIGN_ICONS = ['aperture', 'lens', 'motion', 'pulse', 'light', 'capture'];
function CyclingIcon({
  names,
  labels
}) {
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % names.length), 1600);
    return () => clearInterval(id);
  }, [names.length]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 'clamp(2rem, 4vw, 3.5rem) var(--space-5)',
      maxWidth: 760,
      margin: '0 auto'
    }
  }, names.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      transform: active === i ? 'scale(1.12)' : 'scale(1)',
      transition: 'transform 0.6s var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement(AnimatedIcon, {
    name: n,
    size: 132,
    color: active === i ? 'rust' : 'off-white',
    speed: i % 2 ? 'base' : 'slow'
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: '12px',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: active === i ? 'var(--accent)' : 'var(--text-on-dark-muted)',
      transition: 'color 0.4s var(--ease-standard)'
    }
  }, labels[i]))));
}
function useInView(threshold = 0.2) {
  const ref = React.useRef(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setSeen(true);
      el.querySelectorAll('.snf-icon-scroll').forEach(n => n.setAttribute('data-in-view', 'true'));
    };
    let io;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          reveal();
          io.disconnect();
        }
      }, {
        threshold
      });
      io.observe(el);
    }
    const t = setTimeout(reveal, 600);
    return () => {
      io && io.disconnect();
      clearTimeout(t);
    };
  }, [threshold]);
  return [ref, seen];
}
function Reveal({
  children,
  style,
  delay = 0,
  y = 28
}) {
  const [ref, seen] = useInView(0.18);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      opacity: seen ? 1 : 0,
      transform: seen ? 'none' : `translateY(${y}px)`,
      transition: `opacity 0.9s var(--ease-out) ${delay}ms, transform 0.9s var(--ease-out) ${delay}ms`,
      ...style
    }
  }, children);
}

/* Word-by-word reveal for the big intro statement (FilmLaab-style). */
function WordReveal({
  text,
  style
}) {
  const [ref, seen] = useInView(0.25);
  const words = text.split(' ');
  return /*#__PURE__*/React.createElement("p", {
    ref: ref,
    style: {
      margin: 0,
      ...style
    }
  }, words.map((w, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-block',
      marginRight: '0.28em',
      opacity: seen ? 1 : 0.12,
      transform: seen ? 'none' : 'translateY(12px)',
      transition: `opacity 0.5s var(--ease-out) ${i * 45}ms, transform 0.5s var(--ease-out) ${i * 45}ms`
    }
  }, w)));
}

/* Full-bleed footage backdrop with grain + scrim. */
function Footage({
  children,
  height,
  brightness = 0.42,
  id,
  label,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    "data-screen-label": label,
    style: {
      position: 'relative',
      minHeight: height,
      display: 'flex',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "snf-kenburns",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: IMG,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      filter: `grayscale(1) contrast(1.05) brightness(${brightness})`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(19,18,17,0.55) 0%, rgba(19,18,17,0.42) 45%, rgba(19,18,17,0.82) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 2,
      width: '100%'
    }
  }, children));
}
function Home() {
  const [lang, setLang] = React.useState('SR');
  const t = COPY[lang];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: '#131211'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    className: "snf-grain-fixed"
  }), /*#__PURE__*/React.createElement(NavHeader, {
    lang: lang,
    onToggleLang: () => setLang(lang === 'SR' ? 'EN' : 'SR'),
    links: t.nav
  }), /*#__PURE__*/React.createElement(Footage, {
    id: "hero",
    label: "Hero",
    height: "100vh",
    brightness: 0.5,
    style: {
      marginTop: -84
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 var(--section-pad-x)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "snf-playreel",
    onClick: () => {},
    "aria-label": t.playReel,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      background: 'rgba(244,243,237,0.08)',
      border: '1px solid var(--glass-border)',
      WebkitBackdropFilter: 'blur(12px)',
      backdropFilter: 'blur(12px)',
      color: 'var(--off-white-90)',
      borderRadius: 'var(--radius-pill)',
      padding: '16px 28px',
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: '15px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'var(--accent)',
      color: 'var(--charcoal-900)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(PlayGlyph, null)), t.playReel)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 40,
      left: 'var(--section-pad-x)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      ...eyebrow,
      color: 'var(--text-on-dark-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", null, t.scroll), /*#__PURE__*/React.createElement("span", {
    className: "snf-scrollcue"
  }, "\u2193"))), /*#__PURE__*/React.createElement("section", {
    "data-screen-label": "Statement",
    style: {
      padding: 'clamp(6rem, 12vw, 11rem) var(--section-pad-x)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("h1", {
    style: {
      ...display('clamp(3rem, 9vw, 9rem)', 0.9),
      maxWidth: 1400
    }
  }, t.statement.replace(/\.$/, ''), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 48
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    href: "#contact"
  }, t.statementCta))))), /*#__PURE__*/React.createElement("section", {
    id: "intro",
    "data-screen-label": "Intro",
    style: {
      background: 'var(--charcoal-950)',
      padding: 'clamp(5rem, 10vw, 9rem) var(--section-pad-x)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: 1100
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...eyebrow,
      marginBottom: 40
    }
  }, t.introEyebrow), /*#__PURE__*/React.createElement(WordReveal, {
    text: t.intro,
    style: {
      ...display('clamp(1.6rem, 3.4vw, 3rem)', 1.18),
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '-0.01em',
      color: 'var(--off-white-90)'
    }
  }), /*#__PURE__*/React.createElement(Reveal, {
    delay: 120,
    style: {
      marginTop: 48
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    href: "#capabilities"
  }, t.introCta)))), /*#__PURE__*/React.createElement("section", {
    id: "work",
    "data-screen-label": "Work",
    style: {
      padding: 'clamp(5rem, 9vw, 8rem) var(--section-pad-x)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement(Reveal, {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      flexWrap: 'wrap',
      marginBottom: 'var(--space-9)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...eyebrow,
      marginBottom: 18
    }
  }, t.workEyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('clamp(2.5rem, 5vw, 4.25rem)')
    }
  }, t.workTitle)), /*#__PURE__*/React.createElement("a", {
    href: "#work",
    style: {
      ...eyebrow,
      color: 'var(--off-white-90)',
      textDecoration: 'none',
      display: 'inline-flex',
      gap: 8
    }
  }, t.workAll, " ", /*#__PURE__*/React.createElement("span", null, "\u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: 'var(--space-5)'
    }
  }, t.work.map((w, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: w.tag,
    delay: i % 3 * 90
  }, /*#__PURE__*/React.createElement("a", {
    href: "#work",
    className: "snf-worktile",
    style: {
      display: 'block',
      position: 'relative',
      aspectRatio: '16 / 10',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: IMG,
    alt: "",
    className: "snf-worktile-img",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      filter: 'grayscale(1) contrast(1.05) brightness(0.52)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(19,18,17,0) 45%, rgba(19,18,17,0.85) 100%)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 18,
      right: 20,
      ...eyebrow,
      color: 'var(--text-on-dark-secondary)'
    }
  }, w.tag), /*#__PURE__*/React.createElement("div", {
    className: "snf-worktile-play",
    style: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'rgba(244,243,237,0.12)',
      WebkitBackdropFilter: 'blur(8px)',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--off-white-90)',
      opacity: 0,
      transition: 'opacity var(--dur-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement(PlayGlyph, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 20,
      left: 22,
      right: 22
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      ...display('26px', 1.05),
      color: 'var(--off-white-90)',
      marginBottom: 6
    }
  }, w.t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--text-on-dark-secondary)'
    }
  }, w.s)))))))), /*#__PURE__*/React.createElement("section", {
    id: "capabilities",
    "data-screen-label": "Capabilities",
    style: {
      padding: 'clamp(5rem, 9vw, 8rem) var(--section-pad-x)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement(Reveal, {
    style: {
      marginBottom: 'var(--space-9)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...eyebrow,
      marginBottom: 20
    }
  }, t.capEyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('clamp(2.5rem, 5vw, 4.25rem)')
    }
  }, t.capTitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, t.caps.map((c, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: c.label,
    delay: i * 55
  }, /*#__PURE__*/React.createElement("div", {
    className: "snf-caprow",
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1.1fr) minmax(0, 1fr)',
      gap: 'var(--space-5) var(--space-7)',
      alignItems: 'baseline',
      padding: 'clamp(1.5rem, 2.6vw, 2.4rem) 0',
      borderTop: '1px solid var(--border-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...eyebrow,
      color: 'var(--text-on-dark-muted)'
    }
  }, String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    className: "snf-caprow-label",
    style: {
      ...display('clamp(1.75rem, 3.4vw, 3rem)', 1)
    }
  }, c.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: 'clamp(0.95rem, 1.1vw, 1.0625rem)',
      lineHeight: 1.55,
      color: 'var(--text-on-dark-secondary)'
    }
  }, c.desc)))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-on-dark)'
    }
  })))), /*#__PURE__*/React.createElement("section", {
    "data-screen-label": "Signature",
    style: {
      position: 'relative',
      background: 'var(--charcoal-950)',
      padding: 'clamp(5rem, 10vw, 9rem) var(--section-pad-x)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    style: {
      position: 'absolute',
      width: 'min(1000px, 85vw)',
      height: 'min(1000px, 85vw)',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      background: 'radial-gradient(closest-side, rgba(234,105,58,0.14), rgba(234,105,58,0) 70%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      position: 'relative',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...eyebrow,
      marginBottom: 20
    }
  }, t.signEyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('clamp(2rem, 4.5vw, 3.5rem)'),
      maxWidth: 920,
      margin: '0 auto'
    }
  }, t.signTitle)), /*#__PURE__*/React.createElement(Reveal, {
    delay: 100,
    style: {
      margin: 'clamp(3rem, 6vw, 5rem) 0'
    }
  }, /*#__PURE__*/React.createElement(CyclingIcon, {
    names: SIGN_ICONS,
    labels: t.signNames
  })), /*#__PURE__*/React.createElement(Reveal, {
    delay: 160
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: 'clamp(1.05rem, 1.6vw, 1.35rem)',
      lineHeight: 1.55,
      color: 'var(--text-on-dark-secondary)',
      maxWidth: 560,
      margin: '0 auto'
    }
  }, t.signBody)))), /*#__PURE__*/React.createElement("section", {
    "data-screen-label": "Clients",
    style: {
      background: 'var(--charcoal-950)',
      padding: 'clamp(4rem, 8vw, 7rem) var(--section-pad-x)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...eyebrow,
      marginBottom: 18
    }
  }, t.clientsEyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('clamp(2rem, 4vw, 3.25rem)'),
      marginBottom: 'var(--space-7)'
    }
  }, t.clientsTitle), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '1px',
      background: 'var(--border-on-dark-subtle)',
      border: '1px solid var(--border-on-dark-subtle)'
    }
  }, Array.from({
    length: 6
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: 96,
      background: 'var(--charcoal-900)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-on-dark-muted)',
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      letterSpacing: '0.1em'
    }
  }, "LOGO"))), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 20,
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: '15px',
      color: 'var(--text-on-dark-muted)'
    }
  }, t.clientsNote)))), /*#__PURE__*/React.createElement(Footage, {
    "data-screen-label": "Closing",
    label: "Closing",
    height: "70vh",
    brightness: 0.4
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '0 var(--section-pad-x)'
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('clamp(2.5rem, 6.5vw, 6rem)', 0.95),
      maxWidth: 1200,
      textShadow: '0 6px 40px rgba(0,0,0,0.6)'
    }
  }, t.closing.replace(/\?$/, ''), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "?")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 44
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    href: "#contact"
  }, t.closingCta))))), /*#__PURE__*/React.createElement("section", {
    id: "contact",
    "data-screen-label": "Contact",
    style: {
      padding: 'clamp(5rem, 9vw, 8rem) var(--section-pad-x)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-9)',
      justifyContent: 'space-between',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(Reveal, {
    style: {
      maxWidth: 620
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...eyebrow,
      marginBottom: 20
    }
  }, t.contactEyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...display('clamp(2.5rem, 6vw, 5rem)', 0.95),
      marginBottom: 'var(--space-6)'
    }
  }, t.contactTitle), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: '19px',
      lineHeight: 1.6,
      color: 'var(--text-on-dark-secondary)',
      margin: 0,
      maxWidth: 460
    }
  }, t.contactBody)), /*#__PURE__*/React.createElement(Reveal, {
    delay: 90
  }, /*#__PURE__*/React.createElement("a", {
    href: `mailto:${t.email}`,
    style: {
      ...display('clamp(1.5rem, 3vw, 2.5rem)', 1.1),
      color: 'var(--off-white-90)',
      textDecoration: 'none',
      textTransform: 'none',
      letterSpacing: '-0.01em',
      borderBottom: '2px solid var(--accent)',
      paddingBottom: 8
    }
  }, t.email)))), /*#__PURE__*/React.createElement(Footer, null));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.v1.jsx
try { (() => {
const {
  NavHeader,
  Footer,
  SectionHeader,
  ServiceCard,
  WorkCard,
  FormField,
  Button,
  AnimatedIcon,
  Badge
} = window.SlateNFrameDesignSystem_fc0212;
const COPY = {
  SR: {
    nav: [{
      label: 'Usluge',
      href: '#services'
    }, {
      label: 'Radovi',
      href: '#work'
    }, {
      label: 'O nama',
      href: '#about'
    }, {
      label: 'Kontakt',
      href: '#contact'
    }],
    heroEyebrow: 'Video produkcija & Društvene mreže',
    heroTitle: 'Video koji se gleda do kraja',
    heroBody: 'Snimamo, montiramo i plasiramo sadržaj koji zadržava pažnju — od prve do poslednje sekunde.',
    heroCta: 'Zakaži poziv',
    heroSecondary: 'Pogledaj radove',
    servicesEyebrow: 'Usluge',
    servicesTitle: 'Šta radimo',
    servicesBody: 'Tri stuba jedne iste rečenice: pažljivo, brzo, do kraja.',
    services: [{
      icon: 'pulse',
      title: 'Video Produkcija',
      description: 'Snimanje i montaža — reklame, reels, dokumentarni sadržaj.'
    }, {
      icon: 'motion',
      title: 'Društvene Mreže',
      description: 'Strategija, kalendar objava i svakodnevno vođenje profila.'
    }, {
      icon: 'light',
      title: 'Brendiranje',
      description: 'Vizuelni identitet koji izgleda isto dobro na svakoj platformi.'
    }],
    workEyebrow: 'Radovi',
    workTitle: 'Odabrani projekti',
    aboutEyebrow: 'O nama',
    aboutTitle: 'Proces u četiri koraka',
    aboutSteps: [{
      icon: 'aperture',
      title: 'Fokus',
      text: 'Definišemo cilj i publiku pre nego što uključimo kameru.'
    }, {
      icon: 'capture',
      title: 'Snimanje',
      text: 'Snimamo na terenu ili u studiju, sa punom pripremom.'
    }, {
      icon: 'motion',
      title: 'Montaža',
      text: 'Sklapamo priču — ritam, tempo, zvuk.'
    }, {
      icon: 'lens',
      title: 'Plasman',
      text: 'Objavljujemo i pratimo rezultate na svakoj platformi.'
    }],
    contactEyebrow: 'Kontakt',
    contactTitle: 'Popričajmo o projektu',
    contactBody: 'Pošaljite nam par rečenica o tome šta snimate — javljamo se u roku od 24h.',
    formName: 'Ime i prezime',
    formEmail: 'Email',
    formMessage: 'Poruka',
    formSubmit: 'Pošalji'
  },
  EN: {
    nav: [{
      label: 'Services',
      href: '#services'
    }, {
      label: 'Work',
      href: '#work'
    }, {
      label: 'About',
      href: '#about'
    }, {
      label: 'Contact',
      href: '#contact'
    }],
    heroEyebrow: 'Video Production & Social Media',
    heroTitle: 'Videos you watch till the end',
    heroBody: 'We shoot, edit, and publish content that holds attention — from the first second to the last.',
    heroCta: 'Book a call',
    heroSecondary: 'See our work',
    servicesEyebrow: 'Services',
    servicesTitle: 'What we do',
    servicesBody: 'Three pillars, one sentence: careful, fast, to the end.',
    services: [{
      icon: 'pulse',
      title: 'Video Production',
      description: 'Shooting and editing — ads, reels, documentary content.'
    }, {
      icon: 'motion',
      title: 'Social Media',
      description: 'Strategy, content calendar, and daily account management.'
    }, {
      icon: 'light',
      title: 'Branding',
      description: 'A visual identity that looks just as good on every platform.'
    }],
    workEyebrow: 'Work',
    workTitle: 'Selected projects',
    aboutEyebrow: 'About',
    aboutTitle: 'A four-step process',
    aboutSteps: [{
      icon: 'aperture',
      title: 'Focus',
      text: 'We define the goal and audience before the camera rolls.'
    }, {
      icon: 'capture',
      title: 'Capture',
      text: 'We shoot on location or in-studio, fully prepped.'
    }, {
      icon: 'motion',
      title: 'Edit',
      text: 'We build the story — rhythm, pace, sound.'
    }, {
      icon: 'lens',
      title: 'Publish',
      text: 'We release and track results on every platform.'
    }],
    contactEyebrow: 'Contact',
    contactTitle: "Let's talk about your project",
    contactBody: "Send a few lines about what you're shooting — we reply within 24h.",
    formName: 'Full name',
    formEmail: 'Email',
    formMessage: 'Message',
    formSubmit: 'Send'
  }
};
function Home() {
  const [lang, setLang] = React.useState('SR');
  const t = COPY[lang];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(NavHeader, {
    lang: lang,
    onToggleLang: () => setLang(lang === 'SR' ? 'EN' : 'SR'),
    links: t.nav
  }), /*#__PURE__*/React.createElement("section", {
    id: "hero",
    "data-screen-label": "Hero",
    style: {
      minHeight: '86vh',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '48px',
      width: '100%',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 620,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "accent"
  }, t.heroEyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      fontSize: 'var(--h1-size)',
      lineHeight: 'var(--h1-line)',
      color: 'var(--text-on-dark)',
      margin: 0
    }
  }, t.heroTitle), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-light)',
      fontSize: 'var(--body-lg-size)',
      lineHeight: 'var(--body-lg-line)',
      color: 'var(--text-on-dark-secondary)',
      margin: 0
    }
  }, t.heroBody), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    href: "#contact"
  }, t.heroCta), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    href: "#work"
  }, t.heroSecondary))), /*#__PURE__*/React.createElement("div", {
    className: "drift",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(AnimatedIcon, {
    name: "aperture",
    size: "hero",
    color: "rust"
  })))), /*#__PURE__*/React.createElement("section", {
    id: "services",
    "data-screen-label": "Services",
    style: {
      background: 'var(--charcoal-950)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    icon: "lens",
    eyebrow: t.servicesEyebrow,
    title: t.servicesTitle,
    description: t.servicesBody,
    style: {
      marginBottom: 'var(--space-10)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 'var(--space-6)'
    }
  }, t.services.map((s, i) => /*#__PURE__*/React.createElement(ServiceCard, {
    key: s.title,
    icon: s.icon,
    index: i + 1,
    title: s.title,
    description: s.description
  }))))), /*#__PURE__*/React.createElement("section", {
    id: "work",
    "data-screen-label": "Work"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    icon: "capture",
    eyebrow: t.workEyebrow,
    title: t.workTitle,
    style: {
      marginBottom: 'var(--space-10)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(WorkCard, {
    title: "Nova Retail",
    client: "Nova",
    year: "2025",
    tags: ['Video']
  }), /*#__PURE__*/React.createElement(WorkCard, {
    title: "Reboot Campaign",
    client: "Kraft",
    year: "2024",
    tags: ['Social']
  }), /*#__PURE__*/React.createElement(WorkCard, {
    title: "Launch Day",
    client: "Orbit",
    year: "2024",
    tags: ['Video', 'Ads']
  }), /*#__PURE__*/React.createElement(WorkCard, {
    title: "City Nights",
    client: "Aurora",
    year: "2023",
    tags: ['Video']
  })))), /*#__PURE__*/React.createElement("section", {
    id: "about",
    "data-screen-label": "About",
    style: {
      background: 'var(--charcoal-950)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    icon: "motion",
    eyebrow: t.aboutEyebrow,
    title: t.aboutTitle,
    style: {
      marginBottom: 'var(--space-10)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 'var(--space-7)'
    }
  }, t.aboutSteps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.title,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(AnimatedIcon, {
    name: s.icon,
    size: "lg",
    color: "off-white",
    reactToScroll: true
  }), /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      fontSize: 'var(--h5-size)',
      color: 'var(--text-on-dark)',
      margin: 0
    }
  }, String(i + 1).padStart(2, '0'), " \u2014 ", s.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-light)',
      fontSize: 'var(--body-sm-size)',
      color: 'var(--text-on-dark-secondary)',
      margin: 0
    }
  }, s.text)))))), /*#__PURE__*/React.createElement("section", {
    id: "contact",
    "data-screen-label": "Contact",
    style: {
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: '-60px',
      top: '10%',
      opacity: 0.14
    }
  }, /*#__PURE__*/React.createElement(AnimatedIcon, {
    name: "light",
    size: "hero",
    color: "off-white"
  })), /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: 640,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    icon: "light",
    eyebrow: t.contactEyebrow,
    title: t.contactTitle,
    description: t.contactBody,
    style: {
      marginBottom: 'var(--space-9)'
    }
  }), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => e.preventDefault(),
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(FormField, {
    label: t.formName,
    name: "name",
    placeholder: t.formName
  }), /*#__PURE__*/React.createElement(FormField, {
    label: t.formEmail,
    name: "email",
    type: "email",
    placeholder: "ime@email.com"
  }), /*#__PURE__*/React.createElement(FormField, {
    label: t.formMessage,
    name: "message",
    type: "textarea",
    placeholder: t.formMessage
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    type: "submit"
  }, t.formSubmit))))), /*#__PURE__*/React.createElement(Footer, null));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.v1.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ServiceCard = __ds_scope.ServiceCard;

__ds_ns.WorkCard = __ds_scope.WorkCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.GlassPanel = __ds_scope.GlassPanel;

__ds_ns.Link = __ds_scope.Link;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.FormField = __ds_scope.FormField;

__ds_ns.AnimatedIcon = __ds_scope.AnimatedIcon;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.NavHeader = __ds_scope.NavHeader;

})();
