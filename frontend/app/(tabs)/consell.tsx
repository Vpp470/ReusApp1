import { Redirect } from 'expo-router';

// Aquest fitxer redirigeix a la pantalla principal del consell
export default function ConsellTabRedirect() {
  return <Redirect href="/consell" />;
}
