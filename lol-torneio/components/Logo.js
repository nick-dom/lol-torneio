export const Logo = ({ t, s = 34 }) =>
  t ? (t.logo ? <img className="logo" src={t.logo} alt="" loading="lazy" decoding="async" style={{ width: s, height: s }} /> : <span className="logo tag" style={{ width: s, height: s, background: t.color, fontSize: s * 0.46 }}>{t.tag}</span>) : <span className="logo ghost" style={{ width: s, height: s }}>?</span>;
