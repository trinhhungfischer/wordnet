const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/components/Sidebar.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

if (!content.includes("import { useI18n }")) {
    content = content.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { useI18n } from '../lib/i18n';"
    );
}

if (!content.includes("const { tNode } = useI18n();")) {
    content = content.replace(
        "export default function Sidebar({ selectedNode, selectedNodes = [], edges = [], nodes = [], contextChildLabel, onClose, onAddChild, onDeleteNode, onRenameNode, onToggleNodeIcon, onUpdateNodeIndex, onImportDictionary, copiedTreeConfig, setCopiedTreeConfig, onPasteTreeConfig, autoCutWords, setAutoCutWords, isSettingsOpen }: SidebarProps) {",
        "export default function Sidebar({ selectedNode, selectedNodes = [], edges = [], nodes = [], contextChildLabel, onClose, onAddChild, onDeleteNode, onRenameNode, onToggleNodeIcon, onUpdateNodeIndex, onImportDictionary, copiedTreeConfig, setCopiedTreeConfig, onPasteTreeConfig, autoCutWords, setAutoCutWords, isSettingsOpen }: SidebarProps) {\n  const { tNode } = useI18n();"
    );
}

// Replace visual renders
content = content.replace(/\{cat\.name\}/g, "{tNode(cat.name, 'category')}");
content = content.replace(/\{wObj\.word\}/g, "{tNode(wObj.word, 'chunk')}");
content = content.replace(/\{s\.word\}/g, "{tNode(s.word, 'chunk')}");
content = content.replace(/alt=\{wObj\.word\}/g, "alt={tNode(wObj.word, 'chunk')}");

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated Sidebar.tsx');
