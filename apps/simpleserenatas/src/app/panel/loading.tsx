import { SkeletonList } from '@simple/ui/panel';

export default function PanelLoading() {
    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <SkeletonList count={5} />
        </div>
    );
}
