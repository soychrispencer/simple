// Media module - barrel exports
export { createMediaRouter, createStorageRouter, type MediaRouterDeps, type StorageRouterDeps } from './router.js';
export { optimizeImageForStorage, type ImageUploadPurpose } from './image-optimize.js';
export { optimizeVideoForStorage, isVideoOptimizerAvailable } from './video-optimize.js';
export {
    cleanupReplacedMediaUrl,
    deleteStoredMediaByUrl,
    deleteStoredMediaUrls,
    diffRemovedMediaUrls,
    extractOwnedMediaKey,
    isOwnedStorageUrl,
} from './stored-object.js';
export {
    attachGeneratedVideoToListing,
    createListingReelTitleCard,
    generateListingReelVideo,
    isReelGeneratorAvailable,
} from './generate-listing-reel.js';
