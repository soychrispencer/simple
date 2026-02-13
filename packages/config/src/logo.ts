import { verticalThemes, type VerticalName } from './theme';

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export interface LogoWordmarkTokens {
	text: string;
	fontFamily: string;
	weight: number;
	letterSpacing: string;
	textTransform: TextTransform;
	gradient: string;
	fallbackColor: string;
}

export interface LogoThreadTokens {
	length: number;
	thickness: number;
	radius: number;
	coreFill: string;
	innerStroke: string;
	outerGlow: string;
	highlightFill: string;
	highlightHeight: number;
	highlightOffset: number;
	highlightOpacity: number;
	underGlowFill: string;
	underGlowBlur: number;
}

export interface LogoBeaconFlare {
	width: number;
	height: number;
	offset: number;
	offsetY?: number;
	rotation?: number;
	color: string;
	blur: string;
	radius: number;
	opacity?: number;
	blendMode?: 'normal' | 'screen' | 'lighten' | 'color-dodge';
	border?: string;
}

export interface LogoBeaconTrail {
	width: number;
	height: number;
	offset: number;
	offsetY?: number;
	stroke: string;
	opacity: number;
	blur: string;
	radius: number;
}

export interface LogoBeaconTokens {
	flares: LogoBeaconFlare[];
	trails: LogoBeaconTrail[];
}

export interface LogoSwitcherTokens {
	railFill: string;
	railStroke: string;
	railShadow: string;
	indicatorFill: string;
	indicatorStroke: string;
	indicatorShadow: string;
	indicatorHeight: number;
	indicatorRadius: number;
	indicatorMinWidth: number;
	textActive: string;
	textInactive: string;
	pillFill: string;
	pillBorder: string;
	pillShadow: string;
}

export interface LogoVerticalTokens {
	label: string;
	accent: string;
	thread: LogoThreadTokens;
	beacons: LogoBeaconTokens;
	switcher: LogoSwitcherTokens;
}

export type LogoTokens = {
	wordmark: LogoWordmarkTokens;
} & LogoVerticalTokens;

const baseWordmark: LogoWordmarkTokens = {
	text: 'SIMPLE',
	fontFamily: '"Urbane Rounded", "Avenir Next Rounded", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
	weight: 620,
	letterSpacing: '0.28em',
	textTransform: 'uppercase',
	gradient: 'linear-gradient(104deg, #CFE7FF 0%, #A3B7FF 32%, #FFDBF5 64%, #FFF7CF 100%)',
	fallbackColor: '#F8FBFF',
};

const autosLogo: LogoVerticalTokens = {
		label: 'Autos',
		accent: verticalThemes.autos.primary,
		thread: {
			length: 228,
			thickness: 10,
			radius: 9999,
			coreFill: 'linear-gradient(90deg, #0B64FF 0%, #27E8FF 52%, #F8FF8B 100%)',
			innerStroke: 'rgba(255,255,255,0.55)',
			outerGlow: '0 18px 44px rgba(9,121,255,0.45)',
			highlightFill: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.12))',
			highlightHeight: 3,
			highlightOffset: 1,
			highlightOpacity: 0.9,
			underGlowFill: 'linear-gradient(90deg, rgba(15,204,255,0.5), rgba(255,255,255,0))',
			underGlowBlur: 24,
		},
		beacons: {
			flares: [
				{ width: 28, height: 4, offset: 26, rotation: -4, color: 'rgba(255,255,255,0.95)', blur: '0 0 18px rgba(137,229,255,0.9)', radius: 9999, blendMode: 'screen' },
				{ width: 11, height: 11, offset: 98, offsetY: -3, color: 'rgba(64,255,228,0.95)', blur: '0 0 20px rgba(64,255,228,0.8)', radius: 9999 },
				{ width: 10, height: 28, offset: 160, rotation: 7, color: 'rgba(255,247,167,0.8)', blur: '0 0 22px rgba(246,255,173,0.65)', radius: 10 },
			],
			trails: [
				{ width: 54, height: 2, offset: 58, offsetY: -4, stroke: 'rgba(0,255,240,0.55)', opacity: 0.8, blur: '0 0 16px rgba(0,255,240,0.6)', radius: 9999 },
				{ width: 34, height: 2, offset: 132, offsetY: 3, stroke: 'rgba(255,255,255,0.8)', opacity: 0.35, blur: '0 0 10px rgba(255,255,255,0.5)', radius: 9999 },
			],
		},
		switcher: {
			railFill: 'rgba(3,10,22,0.65)',
			railStroke: 'rgba(255,255,255,0.18)',
			railShadow: '0 24px 48px rgba(8,16,38,0.55)',
			indicatorFill: 'linear-gradient(120deg, #0BA4FF, #45FFD5)',
			indicatorStroke: 'rgba(255,255,255,0.6)',
			indicatorShadow: '0 14px 32px rgba(41,193,255,0.45)',
			indicatorHeight: 30,
			indicatorRadius: 9999,
			indicatorMinWidth: 56,
			textActive: '#02060C',
			textInactive: 'rgba(255,255,255,0.7)',
			pillFill: 'linear-gradient(120deg, #0BA4FF, #45FFD5)',
			pillBorder: 'rgba(255,255,255,0.24)',
			pillShadow: '0 14px 26px rgba(23,189,255,0.4)',
		},
};

const verticalDefinitions: Record<VerticalName, LogoVerticalTokens> = {
	admin: {
		...autosLogo,
		label: 'Admin',
		accent: verticalThemes.admin.primary,
	},
	autos: autosLogo,
	properties: {
		label: 'Propiedades',
		accent: verticalThemes.properties.primary,
		thread: {
			length: 236,
			thickness: 10,
			radius: 9999,
			coreFill: 'linear-gradient(90deg, #00D7A6 0%, #00F8C4 46%, #C7FF9E 100%)',
			innerStroke: 'rgba(255,255,255,0.45)',
			outerGlow: '0 18px 44px rgba(0,201,167,0.4)',
			highlightFill: 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.1))',
			highlightHeight: 3,
			highlightOffset: 1,
			highlightOpacity: 0.85,
			underGlowFill: 'linear-gradient(90deg, rgba(9,237,199,0.45), rgba(255,255,255,0))',
			underGlowBlur: 22,
		},
		beacons: {
			flares: [
				{ width: 30, height: 4, offset: 34, rotation: -6, color: 'rgba(255,255,255,0.92)', blur: '0 0 16px rgba(255,255,255,0.4)', radius: 9999 },
				{ width: 9, height: 9, offset: 118, offsetY: -3, color: 'rgba(124,255,226,0.95)', blur: '0 0 18px rgba(124,255,226,0.75)', radius: 9999 },
				{ width: 8, height: 26, offset: 176, rotation: 8, color: 'rgba(184,255,206,0.9)', blur: '0 0 20px rgba(184,255,206,0.7)', radius: 11 },
			],
			trails: [
				{ width: 60, height: 2, offset: 66, offsetY: -4, stroke: 'rgba(0,255,188,0.55)', opacity: 0.75, blur: '0 0 18px rgba(0,255,188,0.6)', radius: 9999 },
				{ width: 36, height: 2, offset: 146, offsetY: 3, stroke: 'rgba(255,255,255,0.8)', opacity: 0.3, blur: '0 0 12px rgba(255,255,255,0.45)', radius: 9999 },
			],
		},
		switcher: {
			railFill: 'rgba(1,16,12,0.65)',
			railStroke: 'rgba(255,255,255,0.16)',
			railShadow: '0 24px 48px rgba(0,18,12,0.5)',
			indicatorFill: 'linear-gradient(120deg, #00F1B0, #8CFFB5)',
			indicatorStroke: 'rgba(255,255,255,0.52)',
			indicatorShadow: '0 14px 32px rgba(31,216,175,0.45)',
			indicatorHeight: 30,
			indicatorRadius: 9999,
			indicatorMinWidth: 58,
			textActive: '#03110C',
			textInactive: 'rgba(255,255,255,0.72)',
			pillFill: 'linear-gradient(120deg, #00F1B0, #8CFFB5)',
			pillBorder: 'rgba(255,255,255,0.24)',
			pillShadow: '0 14px 26px rgba(7,199,162,0.35)',
		},
	},
	stores: {
		label: 'Tiendas',
		accent: verticalThemes.stores.primary,
		thread: {
			length: 224,
			thickness: 10,
			radius: 9999,
			coreFill: 'linear-gradient(90deg, #5B3BFF 0%, #C347FF 48%, #FF62C6 100%)',
			innerStroke: 'rgba(255,255,255,0.5)',
			outerGlow: '0 18px 46px rgba(149,71,255,0.5)',
			highlightFill: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.18))',
			highlightHeight: 3,
			highlightOffset: 1,
			highlightOpacity: 0.95,
			underGlowFill: 'linear-gradient(90deg, rgba(228,118,255,0.55), rgba(255,255,255,0))',
			underGlowBlur: 26,
		},
		beacons: {
			flares: [
				{ width: 24, height: 4, offset: 32, rotation: -8, color: 'rgba(255,255,255,0.95)', blur: '0 0 18px rgba(255,255,255,0.5)', radius: 9999, blendMode: 'screen' },
				{ width: 12, height: 12, offset: 110, offsetY: -4, color: 'rgba(255,145,229,0.95)', blur: '0 0 20px rgba(255,145,229,0.8)', radius: 9999 },
				{ width: 9, height: 28, offset: 168, rotation: 9, color: 'rgba(172,146,255,0.9)', blur: '0 0 22px rgba(172,146,255,0.7)', radius: 12 },
			],
			trails: [
				{ width: 58, height: 2, offset: 64, offsetY: -3, stroke: 'rgba(196,71,237,0.6)', opacity: 0.85, blur: '0 0 18px rgba(196,71,237,0.6)', radius: 9999 },
				{ width: 32, height: 2, offset: 142, offsetY: 4, stroke: 'rgba(255,255,255,0.8)', opacity: 0.32, blur: '0 0 12px rgba(255,255,255,0.5)', radius: 9999 },
			],
		},
		switcher: {
			railFill: 'rgba(10,2,19,0.65)',
			railStroke: 'rgba(255,255,255,0.2)',
			railShadow: '0 24px 48px rgba(8,2,14,0.55)',
			indicatorFill: 'linear-gradient(120deg, #8B5CFF, #FF5AC7)',
			indicatorStroke: 'rgba(255,255,255,0.6)',
			indicatorShadow: '0 14px 34px rgba(198,88,255,0.45)',
			indicatorHeight: 30,
			indicatorRadius: 9999,
			indicatorMinWidth: 54,
			textActive: '#140112',
			textInactive: 'rgba(255,255,255,0.72)',
			pillFill: 'linear-gradient(120deg, #8B5CFF, #FF5AC7)',
			pillBorder: 'rgba(255,255,255,0.25)',
			pillShadow: '0 14px 28px rgba(198,88,255,0.4)',
		},
	},
	food: {
		label: 'Food',
		accent: verticalThemes.food.primary,
		thread: {
			length: 228,
			thickness: 10,
			radius: 9999,
			coreFill: 'linear-gradient(90deg, #FF8A00 0%, #FFB347 45%, #FFE29F 100%)',
			innerStroke: 'rgba(255,255,255,0.45)',
			outerGlow: '0 18px 44px rgba(255,138,0,0.35)',
			highlightFill: 'linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0.12))',
			highlightHeight: 3,
			highlightOffset: 1,
			highlightOpacity: 0.9,
			underGlowFill: 'linear-gradient(90deg, rgba(255,122,0,0.5), rgba(255,255,255,0))',
			underGlowBlur: 24,
		},
		beacons: {
			flares: [
				{ width: 24, height: 4, offset: 28, rotation: -6, color: 'rgba(255,255,255,0.95)', blur: '0 0 16px rgba(255,255,255,0.55)', radius: 9999 },
				{ width: 12, height: 12, offset: 108, offsetY: -4, color: 'rgba(255,200,120,0.95)', blur: '0 0 20px rgba(255,200,120,0.8)', radius: 9999 },
				{ width: 10, height: 26, offset: 168, rotation: 6, color: 'rgba(255,179,71,0.9)', blur: '0 0 20px rgba(255,179,71,0.7)', radius: 10 },
			],
			trails: [
				{ width: 56, height: 2, offset: 60, offsetY: -3, stroke: 'rgba(255,153,51,0.6)', opacity: 0.8, blur: '0 0 16px rgba(255,153,51,0.55)', radius: 9999 },
				{ width: 30, height: 2, offset: 138, offsetY: 4, stroke: 'rgba(255,255,255,0.8)', opacity: 0.3, blur: '0 0 10px rgba(255,255,255,0.5)', radius: 9999 },
			],
		},
		switcher: {
			railFill: 'rgba(34,14,0,0.65)',
			railStroke: 'rgba(255,255,255,0.22)',
			railShadow: '0 24px 48px rgba(24,10,0,0.5)',
			indicatorFill: 'linear-gradient(120deg, #FF8A00, #FFD56A)',
			indicatorStroke: 'rgba(255,255,255,0.6)',
			indicatorShadow: '0 14px 30px rgba(255,138,0,0.4)',
			indicatorHeight: 30,
			indicatorRadius: 9999,
			indicatorMinWidth: 54,
			textActive: '#220900',
			textInactive: 'rgba(255,255,255,0.7)',
			pillFill: 'linear-gradient(120deg, #FF8A00, #FFD56A)',
			pillBorder: 'rgba(255,255,255,0.22)',
			pillShadow: '0 14px 26px rgba(255,138,0,0.35)',
		},
	},
};

export const availableLogoVerticals = Object.keys(verticalDefinitions) as VerticalName[];

export function getLogoTokens(vertical: VerticalName): LogoTokens {
	return {
		wordmark: baseWordmark,
		...verticalDefinitions[vertical],
	};
}
