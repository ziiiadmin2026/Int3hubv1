import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Int3 Hub OnLine - Gestión Multi-Firewall</title>
        <link rel="icon" href="https://integrational3.com.mx/logorigen/i3logo25x25.png" />
        <meta name="description" content="Plataforma de gestión centralizada para múltiples firewalls pfSense" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
