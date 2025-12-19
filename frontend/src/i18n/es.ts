export default {
  // Tabs
  tabs: {
    home: 'Inicio',
    map: 'Mapa',
    offers: 'Promociones',
    scanner: 'Escanear',
    profile: 'Perfil',
  },

  // Home Screen
  home: {
    greeting: 'Hola',
    subtitle: 'Descubre las mejores promociones de Reus',
    quickActions: {
      giftCards: 'Tarjetas Regalo',
      scanTicket: 'Escanear Ticket',
      establishments: 'Establecimientos',
    },
    featuredOffers: 'Promociones Destacadas',
    upcomingEvents: 'Próximos Eventos',
    seeAll: 'Ver todas',
    noOffers: 'No hay promociones disponibles',
    noEvents: 'No hay eventos próximos',
  },

  // Auth
  auth: {
    login: {
      title: 'Iniciar sesión',
      subtitle: 'Inicia sesión en tu cuenta',
      email: 'Email',
      password: 'Contraseña',
      button: 'Iniciar Sesión',
      noAccount: '¿No tienes una cuenta?',
      register: 'Regístrate',
      errors: {
        fillAll: 'Por favor completa todos los campos',
        invalid: 'Email o contraseña incorrectos',
      },
    },
    register: {
      title: 'Crear Cuenta',
      subtitle: 'Únete a El Tomb de Reus',
      name: 'Nombre completo',
      email: 'Email',
      phone: 'Teléfono (opcional)',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      button: 'Registrarse',
      haveAccount: '¿Ya tienes cuenta?',
      login: 'Inicia sesión',
      errors: {
        fillRequired: 'Por favor completa todos los campos obligatorios',
        passwordMismatch: 'Las contraseñas no coinciden',
        passwordShort: 'La contraseña debe tener al menos 6 caracteres',
        failed: 'No se pudo completar el registro',
      },
    },
  },

  // Offers
  offers: {
    title: 'Promociones',
    active: 'Activa',
    validUntil: 'Válida hasta:',
    noOffers: 'No hay promociones disponibles',
  },

  // Map/Establishments
  map: {
    title: 'Mapa',
    webBanner: 'Vista de lista. En dispositivos móviles verás el mapa interactivo',
    noEstablishments: 'No hay establecimientos disponibles',
    howToGet: 'Cómo llegar',
    viewDetails: 'Ver detalles',
    website: 'Sitio web',
  },

  // Scanner
  scanner: {
    title: 'Escanear Ticket',
    subtitle: 'Usa la cámara para escanear códigos QR de tus tickets',
    webSubtitle: 'En la web, ingresa el código manualmente.\nEn dispositivos móviles, usa la cámara para escanear QR.',
    manualCode: 'Código Manual',
    manualSubtitle: 'Si no puedes escanear, ingresa el código manualmente',
    inputPlaceholder: 'Ingresa el código del ticket',
    submit: 'Registrar Ticket',
    success: '¡Éxito!',
    successMessage: 'Ticket registrado correctamente',
    error: 'Error',
    errorMessage: 'No se pudo registrar el ticket',
    enterCode: 'Por favor ingresa un código',
    whereToFind: '¿Dónde encuentro el código?',
    findLocations: {
      receipt: 'En la parte inferior de tu ticket de compra',
      qr: 'Junto al código QR impreso',
      email: 'En el correo electrónico de confirmación',
    },
    benefits: {
      title: 'Beneficios de registrar tickets',
      raffles: 'Participa en sorteos mensuales',
      points: 'Acumula puntos por tus compras',
      offers: 'Accede a promociones exclusivas',
    },
    infoMessage: 'Escanea el código QR de tu ticket de compra para participar en sorteos y acumular puntos',
  },

  // Profile
  profile: {
    title: 'Perfil',
    myGiftCards: 'Mis Tarjetas Regalo',
    noGiftCards: 'No tienes tarjetas regalo',
    buyGiftCard: 'Comprar Tarjeta Regalo',
    code: 'Código:',
    status: {
      active: 'Activa',
      used: 'Usada',
      expired: 'Expirada',
    },
    balance: 'Saldo disponible',
    viewDetails: 'Ver detalles',
    menu: {
      history: 'Historial de tickets',
      notifications: 'Notificaciones',
      settings: 'Configuración',
      help: 'Ayuda y soporte',
      about: 'Acerca de',
    },
    logout: 'Cerrar sesión',
    logoutConfirm: '¿Estás seguro de que deseas cerrar sesión?',
    cancel: 'Cancelar',
  },

  // Gift Cards
  giftCards: {
    purchase: {
      title: 'Comprar Tarjeta Regalo',
      info: 'Las tarjetas regalo pueden ser usadas en cualquier establecimiento asociado a El Tomb de Reus',
      selectAmount: 'Selecciona el monto',
      selectedAmount: 'Monto seleccionado',
      paymentMethod: 'Método de pago',
      paypal: 'PayPal',
      paypalSubtitle: 'Pago seguro con PayPal',
      card: 'Tarjeta de crédito/débito',
      cardSubtitle: 'Pago con Redsys',
      terms: 'Al completar la compra, aceptas los términos y condiciones de uso de las tarjetas regalo',
      selectAmountError: 'Por favor selecciona un monto',
      comingSoon: 'Próximamente',
      redsysComingSoon: 'La integración con Redsys estará disponible pronto. Por favor usa PayPal.',
      paymentCanceled: 'Pago cancelado',
      canceledMessage: 'Has cancelado el pago',
      verifying: 'Verificando pago',
      verifyingMessage: 'Estamos verificando el estado de tu pago. Por favor revisa tu perfil en unos momentos.',
      errorMessage: 'No se pudo procesar el pago',
    },
  },

  // Promotions
  promotions: {
    create: {
      title: 'Nueva Promoción',
      image: 'Imagen',
      imageHint: 'Podrás elegir si quieres la imagen completa o ajustada',
      selectImage: 'Toca para seleccionar una imagen',
      changeImage: 'Cambiar imagen',
      titleLabel: 'Título',
      description: 'Descripción',
      descriptionPlaceholder: 'Describe la promoción...',
      link: 'Enlace (opcional)',
      linkPlaceholder: 'https://ejemplo.com',
      tag: 'Marcador (opcional)',
      tagHint: 'Ejemplo: "Navidad2025", "Rebajas", "VeranoFest". Sirve para filtrar usuarios participantes.',
      tagPlaceholder: 'Ej: Navidad2025',
      validFrom: 'Válida desde',
      validUntil: 'Válida hasta',
      info: 'La promoción se creará con estado "Pendiente de aprobación" y será revisada por un administrador.',
      submit: 'Crear Promoción',
      required: '*',
    },
  },

  // Admin
  admin: {
    promotions: {
      title: 'Gestión de Promociones',
      descriptionPlaceholder: 'Descripción de la promoción',
      rejectPlaceholder: 'Explica por qué se rechaza esta promoción...',
    },
    establishments: {
      title: 'Gestión de Establecimientos',
      searchPlaceholder: 'Buscar por nombre, categoría, dirección o NIF...',
      collaboration: 'Colaboración',
      collaborationPlaceholder: 'Ej: Patrocinador de eventos, Colaborador cultural...',
      namePlaceholder: 'Nombre del establecimiento',
      nifPlaceholder: 'Ej: B12345678',
      categoryPlaceholder: 'Ej: Restaurante, Tienda, etc.',
      subcategoryPlaceholder: 'Ej: Pizzería, Ropa, etc.',
      commercialNamePlaceholder: 'Nombre comercial (si es diferente del nombre legal)',
      descriptionPlaceholder: 'Descripción del establecimiento',
      addressPlaceholder: 'Dirección completa',
    },
    offers: {
      descriptionPlaceholder: 'Descripción',
      discountPlaceholder: 'Descuento',
      termsPlaceholder: 'Términos y condiciones',
      linkPlaceholder: 'Enlace web',
      phonePlaceholder: 'Teléfono',
    },
    events: {
      descriptionPlaceholder: 'Descripción del evento',
      pricePlaceholder: 'Ej: 10€, Gratis, 20% descuento',
      termsPlaceholder: 'Términos y condiciones',
      searchPlaceholder: 'Buscar local...',
    },
    news: {
      sourcePlaceholder: 'Fuente de la noticia',
      descriptionPlaceholder: 'Descripción breve...',
    },
    users: {
      searchPlaceholder: 'Buscar por nombre o email...',
      searchEstablishmentPlaceholder: 'Buscar establecimiento por nombre...',
    },
    ticketCampaigns: {
      titlePlaceholder: 'Escanea Tickets y Gana Premios',
      descriptionPlaceholder: 'Descripción de la campaña...',
      prizePlaceholder: 'Tarjeta regalo de 100€, viaje, etc...',
      tagHint: 'Ejemplo: "Navidad2025", "Septiembre2025". Sirve para filtrar usuarios participantes.',
      tagPlaceholder: 'Ej: Navidad2025',
    },
    notifications: {
      contentPlaceholder: 'Contenido de la notificación',
    },
    info: {
      descriptionPlaceholder: 'Descripción completa...',
    },
    club: {
      descriptionPlaceholder: 'Descripción breve...',
    },
  },

  // Local Associat
  localAssociat: {
    offers: {
      descriptionPlaceholder: 'Descripción',
      discountPlaceholder: 'Descuento',
      termsPlaceholder: 'Términos y condiciones',
      linkPlaceholder: 'Enlace web',
      phonePlaceholder: 'Teléfono',
    },
  },

  // Establishments
  establishments: {
    searchPlaceholder: 'Buscar por nombre, categoría o dirección...',
  },

  // Common
  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    ok: 'Aceptar',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    back: 'Volver',
    next: 'Siguiente',
    previous: 'Anterior',
    retry: 'Reintentar',
    required: '*',
  },
};