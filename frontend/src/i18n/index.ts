import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { Platform } from 'react-native';
import es from './es';
import ca from './ca';
import en from './en';
import fr from './fr';
import it from './it';
import ru from './ru';

// Crear instancia de i18n
const i18n = new I18n({
  es,
  ca,
  en,
  fr,
  it,
  ru,
});

// Configurar el idioma - CATALÀ per defecte
const setI18nConfig = () => {
  // Sempre català per defecte per a aquesta aplicació
  i18n.locale = 'ca';
  console.log('Idioma configurat: Català (ca)');
};

// Configurar al iniciar
setI18nConfig();

// Permitir fallback a català si no es troba una traducció
i18n.enableFallback = true;
i18n.defaultLocale = 'ca';

// Función para cambiar el idioma manualmente
export const changeLanguage = (languageCode: string) => {
  i18n.locale = languageCode;
  console.log('Language changed to:', languageCode);
};

// Función para obtener el idioma actual
export const getCurrentLanguage = () => i18n.locale;

console.log('i18n initialized with locale:', i18n.locale);

// Export both as default and named export for compatibility
export { i18n };
export default i18n;
