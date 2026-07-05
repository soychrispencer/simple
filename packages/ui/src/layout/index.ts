'use client';

export { MarketplaceFooter, type MarketplaceFooterProps } from './marketplace-footer';
export {
    MarketplaceMobileNav,
    type MarketplaceMobileNavItem,
    type MarketplaceMobileNavLinkProps,
    type MarketplaceMobileNavProps,
} from './marketplace-mobile-nav';
export {
    applyBottomNavPrimaryHighlight,
    isExactBottomNavHref,
    isSameBottomNavHref,
    parseBottomNavHref,
    shouldHideMarketplaceMobileNav,
    type BottomNavHighlightable,
} from './bottom-nav-utils';
export {
    BOTTOM_NAV_BAR_CLASS,
    BOTTOM_NAV_ITEM_CLASS,
    BOTTOM_NAV_LABEL_CLASS,
    BOTTOM_NAV_PRIMARY_LIFT_CLASS,
    bottomNavIsCompact,
    bottomNavMarketplaceVisibilityClass,
    bottomNavPanelVisibilityClass,
    bottomNavPrimaryActionStyle,
    bottomNavShellClassName,
    bottomNavShellStyle,
    bottomNavStandardActiveColor,
    bottomNavStandardMutedColor,
} from './bottom-nav-styles';
export {
    createPanelAccountNavItem,
    PANEL_ACCOUNT_HREF,
    PANEL_ACCOUNT_LABEL,
    type PanelBottomNavAccountIcon,
} from './panel-bottom-nav-account-item';
