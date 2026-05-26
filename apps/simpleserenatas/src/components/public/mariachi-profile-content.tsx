'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import { mariachiProfileTrustFooter } from '@/lib/mariachi-profile-trust';
import { useSerenataRequestModal } from '@/components/serenata-request/serenata-request-modal-context';
import {
    MariachiProfileHero,
    MariachiProfileServicesList,
} from '@/components/panel/mariachi-profile-layout';
import { MariachiRepertoireSection } from '@/components/public/mariachi-repertoire-section';
import { MariachiReviewsSection } from '@/components/public/mariachi-reviews-section';

export function MariachiProfileContent({
    group,
    services,
}: {
    group: ProviderGroup;
    services: ProviderGroupService[];
}) {
    const { openRequest } = useSerenataRequestModal();
    const searchParams = useSearchParams();
    const initialDate = searchParams.get('fecha')?.trim() || searchParams.get('date')?.trim() || undefined;
    const trustFooter = mariachiProfileTrustFooter(group);

    return (
        <div className="grid min-w-0 gap-5">
            <MariachiProfileHero group={group} />

            <MariachiRepertoireSection groupSlug={group.slug} />

            <MariachiReviewsSection group={group} />

            <MariachiProfileServicesList
                services={services}
                footer={trustFooter}
                renderAction={(service) => (
                    <button
                        type="button"
                        className="btn btn-primary w-full text-center text-sm"
                        onClick={() => openRequest({ group, service, date: initialDate })}
                    >
                        Contratar
                    </button>
                )}
            />

            <p className="text-center">
                <Link href="/mariachis" className="text-sm font-medium text-accent hover:underline">
                    Explorar más mariachis
                </Link>
            </p>
        </div>
    );
}
