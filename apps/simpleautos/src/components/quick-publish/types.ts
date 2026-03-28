import type { VehicleCatalogType } from '@/lib/publish-wizard-catalog';

export type QuickListingType = 'sale' | 'rent' | 'auction';

export interface QuickPhoto {
    id: string;
    dataUrl: string;
    previewUrl: string;
    isCover: boolean;
    name: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
}

export interface QuickBasicData {
    listingType: QuickListingType;
    vehicleType: VehicleCatalogType;
    brandId: string;
    customBrand: string;
    brandName?: string;
    modelId: string;
    customModel: string;
    modelName?: string;
    year: string;
    version: string;
    customVersion?: string;
    mileage: string;
    price: string;
    offerPrice: string;
    offerPriceMode: '$' | '%';
    transmission: string;
    color: string;
    bodyType: string;
    fuelType: string;
    condition: string;
    negotiable: boolean;
    financingAvailable: boolean;
    exchangeAvailable?: boolean;
    currency?: 'CLP' | 'USD';
    rentDaily?: string;
    rentWeekly?: string;
    rentMonthly?: string;
    rentMinDays?: string;
    rentDeposit?: string;
    rentAvailableFrom?: string;
    rentAvailableTo?: string;
    auctionStartPrice?: string;
    auctionReservePrice?: string;
    auctionMinIncrement?: string;
    auctionStartAt?: string;
    auctionEndAt?: string;
    traction: string;
    ownerCount: string;
    engineSize?: string;
    doors?: string;
    passengers?: string;
    steeringWheel?: string;
}

export interface GeneratedText {
    titulo: string;
    descripcion: string;
    colorDetectado?: string;
}

export type QuickPublishStep = 1 | 2 | 3 | 'success';
