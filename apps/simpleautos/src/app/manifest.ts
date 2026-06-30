import type { MetadataRoute } from 'next';
import { buildSimpleAppManifest } from '@simple/config';

export default function manifest(): MetadataRoute.Manifest {
    return buildSimpleAppManifest('simpleautos');
}
