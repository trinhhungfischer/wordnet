const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/components/LevelSettings.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

if (!content.includes("import { useI18n }")) {
    content = content.replace(
        "import React, { useState, useEffect, useCallback, useMemo } from 'react';",
        "import React, { useState, useEffect, useCallback, useMemo } from 'react';\nimport { useI18n } from '../lib/i18n';"
    );
    // Add fallback if first replacement failed
    if (!content.includes("import { useI18n }")) {
        content = content.replace(
            "import React, { useState, useEffect } from 'react';",
            "import React, { useState, useEffect } from 'react';\nimport { useI18n } from '../lib/i18n';"
        );
    }
}

if (!content.includes("const { tNode } = useI18n();")) {
    content = content.replace(
        "export default function LevelSettings({ isOpen, onClose, levelData, onSave, onFocusWord, onCalculateSolution, levelName }: LevelSettingsProps) {",
        "export default function LevelSettings({ isOpen, onClose, levelData, onSave, onFocusWord, onCalculateSolution, levelName }: LevelSettingsProps) {\n  const { tNode } = useI18n();"
    );
}

// Replace visual renders
content = content.replace(/\{word\}/g, "{tNode(word)}");
content = content.replace(/\{frozenItem\.word\}/g, "{tNode(frozenItem.word)}");
content = content.replace(/\{iceBombItem\.word\}/g, "{tNode(iceBombItem.word)}");
content = content.replace(/\{burstItem\.word\}/g, "{tNode(burstItem.word)}");
content = content.replace(/\{bwItem\.word\}/g, "{tNode(bwItem.word)}");

// For crack item which splits the word
content = content.replace(
    /const wStr = String\(crackItem\.word\);/g,
    "const wStr = String(tNode(crackItem.word));"
);
content = content.replace(
    /crackItem\.word && String\(crackItem\.word\)\.split\(''\)/g,
    "crackItem.word && String(tNode(crackItem.word)).split('')"
);

// Focus titles
content = content.replace(/title=\{\`Focus on \$\{crackItem\.word\}\`\}/g, "title={`Focus on ${tNode(crackItem.word)}`}");

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated LevelSettings.tsx');
