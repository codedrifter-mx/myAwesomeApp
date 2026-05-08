export default function HomePage() {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'myawesomeapp-frontend';
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/dashboard';
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  const loginUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid`;

  const registerUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/registrations?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>myAwesomeApp</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>Demo application for LiveOps incident response</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <a
          href={loginUrl}
          style={{
            padding: '0.75rem 2rem',
            background: '#38b2ac',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Sign In
        </a>
        <a
          href={registerUrl}
          style={{
            padding: '0.75rem 2rem',
            background: 'transparent',
            color: '#38b2ac',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            border: '2px solid #38b2ac',
          }}
        >
          Create Account
        </a>
      </div>
      <p style={{ color: '#555', marginTop: '2rem', fontSize: '0.85rem' }}>
        Demo credentials: demo / demo
      </p>
    </div>
  );
}