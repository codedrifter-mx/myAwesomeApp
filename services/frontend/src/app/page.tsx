export default function HomePage() {
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>myAwesomeApp</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>Demo application for LiveOps incident response</p>
      <a
        href={`${authUrl}/authorize?redirect_uri=${encodeURIComponent('http://localhost:3000/dashboard')}&state=random-state`}
        style={{
          padding: '0.75rem 2rem',
          background: '#38b2ac',
          color: '#fff',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Sign In with OAuth
      </a>
    </div>
  );
}