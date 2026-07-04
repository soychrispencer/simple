import { SkeletonList } from '@simple/ui/panel';

export default function PanelLoading() {
    return (
        <div className="p-4 md:p-6">
            <SkeletonList count={5} />
        </div>
    );
}
