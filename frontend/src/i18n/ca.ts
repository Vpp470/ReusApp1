export default {
  // Tabs
  tabs: {
    home: 'Inici',
    map: 'Mapa',
    offers: 'Promocions',
    scanner: 'Escanejar',
    profile: 'Perfil',
  },

  // Home Screen
  home: {
    greeting: 'Hola',
    subtitle: 'Descobreix les millors promocions de Reus',
    quickActions: {
      giftCards: 'Targetes Regal',
      scanTicket: 'Escanejar Tiquet',
      establishments: 'Establiments',
    },
    featuredOffers: 'Promocions Destacades',
    upcomingEvents: 'Propers Esdeveniments',
    seeAll: 'Veure totes',
    noOffers: 'No hi ha promocions disponibles',
    noEvents: 'No hi ha esdeveniments propers',
  },

  // Auth
  auth: {
    login: {
      title: 'Inicia sessió',
      subtitle: 'Inicia sessió al teu compte',
      email: 'Correu electrònic',
      password: 'Contrasenya',
      button: 'Iniciar Sessió',
      noAccount: 'No tens compte?',
      register: 'Registra\'t',
      errors: {
        fillAll: 'Si us plau, omple tots els camps',
        invalid: 'Correu o contrasenya incorrectes',
      },
    },
    register: {
      title: 'Crear Compte',
      subtitle: 'Uneix-te a REUS COMERÇ i FUTUR',
      name: 'Nom complet',
      email: 'Correu electrònic',
      phone: 'Telèfon *',
      password: 'Contrasenya',
      confirmPassword: 'Confirmar contrasenya',
      birthDate: 'Data de naixement (AAAA-MM-DD)',
      birthDateFormat: 'Format: AAAA-MM-DD (exemple: 1990-05-15)',
      gender: 'Gènere (Home/Dona/Altre) *',
      address: 'Adreça *',
      city: 'Ciutat *',
      button: 'Registrar-se',
      haveAccount: 'Ja tens compte?',
      login: 'Inicia sessió',
      consent: 'Accepto la',
      privacyPolicy: 'Política de Privacitat',
      errors: {
        fillRequired: 'Si us plau, omple tots els camps obligatoris',
        passwordMismatch: 'Les contrasenyes no coincideixen',
        passwordShort: 'La contrasenya ha de tenir almenys 6 caràcters',
        failed: 'No s\'ha pogut completar el registre',
      },
    },
  },

  // Offers
  offers: {
    title: 'Promocions',
    active: 'Activa',
    validUntil: 'Vàlida fins:',
    noOffers: 'No hi ha promocions disponibles',
  },

  // Map/Establishments
  map: {
    title: 'Mapa',
    webBanner: 'Vista de llista. En dispositius mòbils veuràs el mapa interactiu',
    noEstablishments: 'No hi ha establiments disponibles',
    howToGet: 'Com arribar-hi',
    viewDetails: 'Veure detalls',
    website: 'Lloc web',
  },

  // Scanner
  scanner: {
    title: 'Escanejar Tiquet',
    subtitle: 'Usa la càmera per escanejar codis QR dels teus tiquets',
    webSubtitle: 'A la web, introdueix el codi manualment.\nEn dispositius mòbils, usa la càmera per escanejar QR.',
    manualCode: 'Codi Manual',
    manualSubtitle: 'Si no pots escanejar, introdueix el codi manualment',
    inputPlaceholder: 'Introdueix el codi del tiquet',
    submit: 'Registrar Tiquet',
    success: 'Èxit!',
    successMessage: 'Tiquet registrat correctament',
    error: 'Error',
    errorMessage: 'No s\'ha pogut registrar el tiquet',
    enterCode: 'Si us plau, introdueix un codi',
    whereToFind: 'On trobo el codi?',
    findLocations: {
      receipt: 'A la part inferior del teu tiquet de compra',
      qr: 'Al costat del codi QR imprès',
      email: 'Al correu electrònic de confirmació',
    },
    benefits: {
      title: 'Beneficis de registrar tiquets',
      raffles: 'Participa en sortejos mensuals',
      points: 'Acumula punts per les teves compres',
      offers: 'Accedeix a promocions exclusives',
    },
    infoMessage: 'Escaneja el codi QR del teu tiquet de compra per participar en sortejos i acumular punts',
  },

  // Profile
  profile: {
    title: 'Perfil',
    myGiftCards: 'Les meves Targetes Regal',
    noGiftCards: 'No tens targetes regal',
    buyGiftCard: 'Comprar Targeta Regal',
    code: 'Codi:',
    status: {
      active: 'Activa',
      used: 'Usada',
      expired: 'Caducada',
    },
    balance: 'Saldo disponible',
    viewDetails: 'Veure detalls',
    menu: {
      history: 'Historial de tiquets',
      notifications: 'Notificacions',
      settings: 'Configuració',
      help: 'Ajuda i suport',
      about: 'Sobre nosaltres',
    },
    logout: 'Tancar sessió',
    logoutConfirm: 'Estàs segur que vols tancar sessió?',
    cancel: 'Cancel·lar',
  },

  // About
  about: {
    title: 'Sobre nosaltres',
    appOwner: 'Aquesta WebApp és propietat de El Tomb de Reus',
  },

  // Help
  help: {
    title: 'Ajuda i Suport',
    subtitle: 'Si necessites ajuda, pots contactar-nos:',
    phone: 'Per telèfon',
    phoneNumber: '656 331 410',
    callNow: 'Trucar ara',
    email: 'Per correu electrònic',
    emailAddress: 'gestio@eltombdereus.com',
    sendEmail: 'Enviar correu',
  },

  // Tickets History
  ticketsHistory: {
    title: 'Historial de Tiquets',
    myTickets: 'Els meus Tiquets',
    noTickets: 'No has escanejat cap tiquet encara',
    scanFirst: 'Escaneja el teu primer tiquet per participar en sortejos',
    ticketNumber: 'Tiquet',
    amount: 'Import',
    establishment: 'Establiment',
    date: 'Data',
    nextDraw: 'Proper Sorteig',
    noDraw: 'No hi ha sortejos actius',
    drawDate: 'Data del sorteig',
    prize: 'Premi',
    myParticipations: 'Les meves Participacions',
    campaignActive: 'Campanya Activa',
    totalTickets: 'Total de tiquets',
    validFor: 'Vàlid per',
  },

  // Notifications
  notifications: {
    title: 'Notificacions',
    noNotifications: 'No tens notificacions',
    markAsRead: 'Marcar com a llegida',
    delete: 'Eliminar',
    deleteConfirm: 'Vols eliminar aquesta notificació?',
    new: 'Nova',
  },

  // Gift Cards
  giftCards: {
    purchase: {
      title: 'Comprar Targeta Regal',
      info: 'Les targetes regal es poden usar en qualsevol establiment associat a El Tomb de Reus',
      selectAmount: 'Selecciona l\'import',
      selectedAmount: 'Import seleccionat',
      paymentMethod: 'Mètode de pagament',
      paypal: 'PayPal',
      paypalSubtitle: 'Pagament segur amb PayPal',
      card: 'Targeta de crèdit/dèbit',
      cardSubtitle: 'Pagament amb Redsys',
      terms: 'En completar la compra, acceptes els termes i condicions d\'ús de les targetes regal',
      selectAmountError: 'Si us plau, selecciona un import',
      comingSoon: 'Properament',
      redsysComingSoon: 'La integració amb Redsys estarà disponible aviat. Si us plau, usa PayPal.',
      paymentCanceled: 'Pagament cancel·lat',
      canceledMessage: 'Has cancel·lat el pagament',
      verifying: 'Verificant pagament',
      verifyingMessage: 'Estem verificant l\'estat del teu pagament. Si us plau, revisa el teu perfil en uns moments.',
      errorMessage: 'No s\'ha pogut processar el pagament',
    },
  },

  // Promotions
  promotions: {
    create: {
      title: 'Nova Promoció',
      image: 'Imatge',
      imageHint: 'Podràs triar si vols la imatge completa o ajustada',
      selectImage: 'Toca per seleccionar una imatge',
      changeImage: 'Canviar imatge',
      titleLabel: 'Títol',
      description: 'Descripció',
      descriptionPlaceholder: 'Descriu la promoció...',
      link: 'Enllaç (opcional)',
      linkPlaceholder: 'https://exemple.com',
      tag: 'Marcador (opcional)',
      tagHint: 'Exemple: "Nadal2025", "Rebaixes", "EstiuFest". Serveix per filtrar usuaris participants.',
      tagPlaceholder: 'Ex: Nadal2025',
      validFrom: 'Vàlida des de',
      validUntil: 'Vàlida fins a',
      info: 'La promoció es crearà amb estat "Pendent d\'aprovació" i serà revisada per un administrador.',
      submit: 'Crear Promoció',
      required: '*',
    },
  },

  // Admin
  admin: {
    promotions: {
      title: 'Gestió de Promocions',
      descriptionPlaceholder: 'Descripció de la promoció',
      rejectPlaceholder: 'Explica per què es rebutja aquesta promoció...',
    },
    establishments: {
      title: 'Gestió d\'Establiments',
      searchPlaceholder: 'Cercar per nom, categoria, adreça o NIF...',
      collaboration: 'Col·laboració',
      collaborationPlaceholder: 'Ex: Patrocinador d\'esdeveniments, Col·laborador cultural...',
      namePlaceholder: 'Nom de l\'establiment',
      nifPlaceholder: 'Ex: B12345678',
      categoryPlaceholder: 'Ex: Restaurant, Botiga, etc.',
      subcategoryPlaceholder: 'Ex: Pizzeria, Roba, etc.',
      commercialNamePlaceholder: 'Nom comercial (si és diferent del nom legal)',
      descriptionPlaceholder: 'Descripció de l\'establiment',
      addressPlaceholder: 'Adreça completa',
    },
    offers: {
      descriptionPlaceholder: 'Descripció',
      discountPlaceholder: 'Descompte',
      termsPlaceholder: 'Termes i condicions',
      linkPlaceholder: 'Enllaç web',
      phonePlaceholder: 'Telèfon',
    },
    events: {
      descriptionPlaceholder: 'Descripció de l\'esdeveniment',
      pricePlaceholder: 'Ex: 10€, Gratuït, 20% descompte',
      termsPlaceholder: 'Termes i condicions',
      searchPlaceholder: 'Cercar local...',
    },
    news: {
      sourcePlaceholder: 'Font de la notícia',
      descriptionPlaceholder: 'Descripció breu...',
    },
    users: {
      searchPlaceholder: 'Buscar per nom o email...',
      searchEstablishmentPlaceholder: 'Buscar establiment per nom...',
    },
    ticketCampaigns: {
      titlePlaceholder: 'Escaneja Tiquets i Guanya Premis',
      descriptionPlaceholder: 'Descripció de la campanya...',
      prizePlaceholder: 'Targeta regal de 100€, viatge, etc...',
      tagHint: 'Exemple: "Nadal2025", "Setembre2025". Serveix per filtrar usuaris participants.',
      tagPlaceholder: 'Ex: Nadal2025',
    },
    notifications: {
      contentPlaceholder: 'Contingut de la notificació',
    },
    info: {
      descriptionPlaceholder: 'Descripció completa...',
    },
    club: {
      descriptionPlaceholder: 'Descripció breu...',
    },
  },

  // Local Associat
  localAssociat: {
    offers: {
      descriptionPlaceholder: 'Descripció',
      discountPlaceholder: 'Descompte',
      termsPlaceholder: 'Termes i condicions',
      linkPlaceholder: 'Enllaç web',
      phonePlaceholder: 'Telèfon',
    },
  },

  // Establishments
  establishments: {
    searchPlaceholder: 'Cercar per nom, categoria o adreça...',
  },

  // Common
  common: {
    loading: 'Carregant...',
    error: 'Error',
    success: 'Èxit',
    ok: 'D\'acord',
    cancel: 'Cancel·lar',
    save: 'Desar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Tancar',
    back: 'Tornar',
    next: 'Següent',
    previous: 'Anterior',
    retry: 'Tornar a intentar',
    required: '*',
  },
};