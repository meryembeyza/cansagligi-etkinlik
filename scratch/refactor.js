const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/register/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace top level auth-layout
content = content.replace(/<div style=\{\{\s*minHeight: '100vh',\s*display: 'flex',\s*flexDirection: 'column',\s*alignItems: 'center',\s*justifyContent: 'center',\s*backgroundColor: '#f9fafb',\s*padding: '2rem 1rem'\s*\}\}>/g, '<div className="auth-layout">');

// Replace auth-card
content = content.replace(/<div className="card" style=\{\{\s*maxWidth: '700px',\s*width: '100%',\s*padding: '2\.5rem',\s*position: 'relative'\s*\}\}>/g, '<div className="auth-card">');

// Replace auth-back-link
content = content.replace(/<Link href="\/login" style=\{\{\s*position: 'absolute',\s*top: '1\.5rem',\s*left: '1\.5rem',\s*display: 'flex',\s*alignItems: 'center',\s*gap: '0\.25rem',\s*color: 'var\(--text-muted\)',\s*textDecoration: 'none',\s*fontSize: '0\.875rem'\s*\}\}>/g, '<Link href="/login" className="auth-back-link">');

// Replace auth-logo-container
content = content.replace(/<div style=\{\{\s*textAlign: 'center',\s*marginBottom: '2\.5rem',\s*marginTop: '1rem'\s*\}\}>/g, '<div className="auth-logo-container">');

// Replace auth-logo
content = content.replace(/<img src="\/logo\.png" alt="Cansağlığı Logo" style=\{\{\s*height: '45px',\s*objectFit: 'contain',\s*margin: '0 auto 0\.5rem'\s*\}\} \/>/g, '<img src="/logo.png" alt="Cansağlığı Logo" className="auth-logo" />');

// Replace auth-title
content = content.replace(/<h1 style=\{\{\s*fontSize: '1\.5rem',\s*fontWeight: 700,\s*color: '#1a202c'\s*\}\}>/g, '<h1 className="auth-title">');

// Replace error-box
content = content.replace(/<div style=\{\{\s*backgroundColor: '#fef2f2',\s*color: '#991b1b',\s*padding: '1rem',\s*borderRadius: 'var\(--radius-md\)',\s*fontSize: '0\.875rem',\s*marginBottom: '1\.5rem',\s*border: '1px solid #fecaca'\s*\}\}>/g, '<div className="error-box">');

// Replace step-title
content = content.replace(/<h3 style=\{\{\s*fontSize: '1\.25rem',\s*fontWeight: 600,\s*marginBottom: '1\.5rem',\s*color: '#1f2937'\s*\}\}>/g, '<h3 className="step-title">');

// Replace form-grid-2
content = content.replace(/<div style=\{\{\s*display: 'grid',\s*gridTemplateColumns: '1fr 1fr',\s*gap: '1\.25rem'\s*\}\}>/g, '<div className="form-grid-2">');

// Replace form-grid
content = content.replace(/<div style=\{\{\s*display: 'grid',\s*gap: '1\.25rem'\s*\}\}>/g, '<div className="form-grid">');

// Replace form-grid with margin
content = content.replace(/<div style=\{\{\s*display: 'grid',\s*gap: '1\.25rem',\s*marginBottom: '1\.5rem'\s*\}\}>/g, '<div className="form-grid" style={{ marginBottom: \'1.5rem\' }}>');

// Replace checkbox-label with errors
content = content.replace(/<label style=\{\{\s*display: 'flex',\s*alignItems: 'flex-start',\s*gap: '0\.75rem',\s*cursor: 'pointer',\s*backgroundColor: '#f8fafc',\s*padding: '1rem',\s*borderRadius: 'var\(--radius-md\)',\s*border: `1px solid \$\{errors\.kvkkApproved \? '#fca5a5' : '#e2e8f0'\}`\s*\}\}>/g, '<label className="checkbox-label" style={{ border: `1px solid ${errors.kvkkApproved ? \'#fca5a5\' : \'#e2e8f0\'}` }}>');

// Replace checkbox-label without errors
content = content.replace(/<label style=\{\{\s*display: 'flex',\s*alignItems: 'flex-start',\s*gap: '0\.75rem',\s*cursor: 'pointer',\s*backgroundColor: '#f8fafc',\s*padding: '1rem',\s*borderRadius: 'var\(--radius-md\)',\s*border: '1px solid #e2e8f0'\s*\}\}>/g, '<label className="checkbox-label">');

// Replace btn-group
content = content.replace(/<div style=\{\{\s*display: 'flex',\s*justifyContent: 'space-between',\s*marginTop: '2rem',\s*paddingTop: '1\.5rem',\s*borderTop: '1px solid #e5e7eb'\s*\}\}>/g, '<div className="btn-group">');

// Replace form error
content = content.replace(/<div style=\{\{\s*color: '#dc2626',\s*fontSize: '0\.75rem',\s*marginTop: '0\.25rem'\s*\}\}>/g, '<div className="error-text">');
content = content.replace(/<div style=\{\{\s*color: '#dc2626',\s*fontSize: '0\.75rem',\s*marginTop: '0\.5rem',\s*paddingLeft: '0\.25rem'\s*\}\}>/g, '<div className="error-text" style={{ marginTop: \'0.5rem\', paddingLeft: \'0.25rem\' }}>');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring completed successfully.');
