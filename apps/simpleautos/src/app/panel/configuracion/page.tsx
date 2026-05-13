import {
    IconUser,
    IconNotebook,
    IconMapPin,
    IconPlugConnected,
    IconCreditCard,
    IconShield,
} from '@tabler/icons-react';
import { PanelConfigPage, type PanelConfigSectionItem } from '@simple/ui';

const CONFIG_SECTIONS: PanelConfigSectionItem[] = [
    {
        key: 'cuenta',
        href: '/panel/configuracion/cuenta',
        icon: <IconUser size={18} />,
        title: 'Datos personales',
        description: 'Nombre, correo y teléfono de tu cuenta.',
        required: true,
    },
    {
        key: 'seguridad',
        href: '/panel/configuracion/seguridad',
        icon: <IconShield size={18} />,
        title: 'Seguridad',
        description: 'Contraseña, autenticación de dos factores.',
        required: true,
    },
    {
        key: 'pagina',
        href: '/panel/configuracion/pagina',
        icon: <IconNotebook size={18} />,
        title: 'Página pública',
        description: 'Personaliza tu perfil visible para compradores.',
        required: false,
    },
    {
        key: 'direcciones',
        href: '/panel/configuracion/direcciones',
        icon: <IconMapPin size={18} />,
        title: 'Direcciones',
        description: 'Gestiona tus direcciones de despacho y retiro.',
        required: false,
    },
    {
        key: 'integraciones',
        href: '/panel/configuracion/integraciones',
        icon: <IconPlugConnected size={18} />,
        title: 'Integraciones',
        description: 'Conecta Instagram y otros servicios externos.',
        required: false,
    },
    {
        key: 'suscripciones',
        href: '/panel/suscripciones',
        icon: <IconCreditCard size={18} />,
        title: 'Suscripción',
        description: 'Gestiona tu plan y método de pago mensual.',
        required: true,
    },
];

export default function ConfiguracionPage() {
    return (
        <PanelConfigPage
            title="Mi Cuenta"
            description="Administra tus datos personales y tu perfil de cuenta."
            sections={CONFIG_SECTIONS}
        />
    );
}
