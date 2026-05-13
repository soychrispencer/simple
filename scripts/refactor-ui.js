const { Project } = require('ts-morph');
const path = require('path');

const uiDir = path.resolve(process.cwd(), 'packages', 'ui', 'src');
const indexPath = path.join(uiDir, 'index.tsx');

const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'packages', 'ui', 'tsconfig.json'),
});

const indexFile = project.getSourceFile(indexPath);
if (!indexFile) {
    console.error('No se pudo cargar index.tsx');
    process.exit(1);
}

const groupings = {
    'panel-buttons.tsx': ['PanelButton', 'PanelIconButton', 'getPanelButtonClassName', 'getPanelButtonStyle', 'PanelSwitch', 'PanelSegmentedToggle'],
    'panel-cards.tsx': ['PanelCard', 'PanelChoiceCard', 'PanelSummaryCard'],
    'panel-layout.tsx': ['PanelPageLayout', 'PanelPageHeader', 'PanelBlockHeader', 'PanelPillNav', 'PanelStepNav', 'PanelList', 'PanelListHeader', 'PanelListRow', 'PanelEmptyState', 'PanelNotice', 'PanelStatusBadge', 'PanelActions'],
    'panel-inputs.tsx': ['PanelSearchField', 'PanelMediaUploader', 'PanelVideoUploader', 'PanelDocumentUploader', 'PanelImageUploader']
};

const extractedNames = new Set();

Object.entries(groupings).forEach(([fileName, componentNames]) => {
    // Collect functions to extract
    const functionsToExtract = indexFile.getFunctions().filter(f => {
        const name = f.getName();
        return name && componentNames.includes(name);
    });
    
    // Also extract interfaces starting with the component name + "Props"
    const interfacesToExtract = indexFile.getInterfaces().filter(i => {
        const name = i.getName();
        return componentNames.some(cn => name === `${cn}Props` || name === `${cn}Type`);
    });
    
    // Also extract types starting with component name + "Props"
    const typesToExtract = indexFile.getTypeAliases().filter(t => {
        const name = t.getName();
        return componentNames.some(cn => name === `${cn}Props` || name === `${cn}Type` || name === `${cn}Variant`);
    });

    if (functionsToExtract.length === 0 && interfacesToExtract.length === 0 && typesToExtract.length === 0) return;

    // Create the new file
    const newFilePath = path.join(uiDir, fileName);
    const newFile = project.createSourceFile(newFilePath, "import React from 'react';\nimport { IconAlertTriangle, IconCheck, IconInfoCircle } from '@tabler/icons-react';\n\n", { overwrite: true });

    // Move types and interfaces first
    typesToExtract.forEach(t => {
        newFile.addTypeAlias(t.getStructure());
        t.remove();
    });
    
    interfacesToExtract.forEach(i => {
        newFile.addInterface(i.getStructure());
        i.remove();
    });

    // Move functions
    functionsToExtract.forEach(f => {
        newFile.addFunction(f.getStructure());
        extractedNames.add(f.getName());
        f.remove();
    });

    // Fix imports in new file - add required simple ones, let eslint/ts deal with others or we add standard ones.
    // (This is a simplified script, we might need to fix imports manually afterwards)
    
    console.log(`Extracted to ${fileName}`);
});

// Update index.tsx to export the extracted files
Object.keys(groupings).forEach(fileName => {
    const baseName = fileName.replace('.tsx', '');
    indexFile.addExportDeclaration({
        moduleSpecifier: `./${baseName}`
    });
});

project.saveSync();
console.log('Done refactoring!');
