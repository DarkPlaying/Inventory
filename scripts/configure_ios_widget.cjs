const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const projectPath = path.join(__dirname, '..', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const myProj = xcode.project(projectPath);

myProj.parseSync();

// Check if already configured
const targets = myProj.pbxNativeTargetSection();
for (const key in targets) {
    if (targets[key] && targets[key].name === '"StockWidgetExtension"') {
        console.log('StockWidgetExtension target already exists.');
        process.exit(0);
    }
}

console.log('Configuring iOS StockWidget Extension...');

// 1. Create StockWidget group
const rootGroupKey = myProj.getFirstProject().firstProject.mainGroup;
const stockWidgetGroupUuid = myProj.pbxCreateGroup('StockWidget', 'StockWidget');
myProj.addToPbxGroup(stockWidgetGroupUuid, rootGroupKey);

// 2. Add StockWidgetExtension target
const target = myProj.addTarget('StockWidgetExtension', 'app_extension', 'StockWidget');

// 3. Configure Build Settings for Debug and Release
const configs = myProj.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList].buildConfigurations;
for (const config of configs) {
    const buildSettings = myProj.pbxXCBuildConfigurationSection()[config.value].buildSettings;
    buildSettings.PRODUCT_NAME = '"StockWidgetExtension"';
    buildSettings.PRODUCT_BUNDLE_IDENTIFIER = '"com.inventoryapp.app.StockWidget"';
    buildSettings.INFOPLIST_FILE = 'StockWidget/Info.plist';
    buildSettings.SWIFT_VERSION = '5.0';
    buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '15.0';
    buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
    buildSettings.SKIP_INSTALL = 'YES';
    buildSettings.CODE_SIGN_STYLE = 'Automatic';
    buildSettings.CODE_SIGN_IDENTITY = '"iPhone Developer"';
    buildSettings.DEVELOPMENT_TEAM = '""';
    buildSettings.LD_RUNPATH_SEARCH_PATHS = [
        '"$(inherited)"',
        '"@executable_path/Frameworks"',
        '"@executable_path/../../Frameworks"'
    ];
    buildSettings.MARKETING_VERSION = '1.0';
    buildSettings.CURRENT_PROJECT_VERSION = 1;
    buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
    buildSettings.SWIFT_OPTIMIZATION_LEVEL = config.comment === 'Debug' ? '"-Onone"' : '"-O"';
    if (config.comment === 'Debug') {
        buildSettings.SWIFT_ACTIVE_COMPILATION_CONDITIONS = 'DEBUG';
    }
}

// 4. Add build phases to StockWidget target
myProj.addBuildPhase(['StockWidget/StockWidget.swift'], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
myProj.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
myProj.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);

// Add files to group
myProj.addFile('StockWidget/StockWidget.swift', stockWidgetGroupUuid);
myProj.addFile('StockWidget/Info.plist', stockWidgetGroupUuid);

// 5. Add StockWidgetPlugin.swift to App
const appGroupKey = '504EC3061FED79650016851F';
myProj.addSourceFile('StockWidgetPlugin.swift', null, appGroupKey);

// 6. Add target dependency to App
if (!myProj.hash.project.objects.PBXTargetDependency) myProj.hash.project.objects.PBXTargetDependency = {};
if (!myProj.hash.project.objects.PBXContainerItemProxy) myProj.hash.project.objects.PBXContainerItemProxy = {};
const appTargetKey = myProj.findTargetKey('App');
myProj.addTargetDependency(appTargetKey, [target.uuid]);

// 7. Embed App Extensions in App
const copyFilesUuid = myProj.generateUuid();
const buildFileUuid = myProj.generateUuid();

myProj.hash.project.objects.PBXBuildFile[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: target.pbxNativeTarget.productReference,
    fileRef_comment: 'StockWidgetExtension.appex',
    settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] }
};
myProj.hash.project.objects.PBXBuildFile[buildFileUuid + '_comment'] = 'StockWidgetExtension.appex in Embed App Extensions';

if (!myProj.hash.project.objects.PBXCopyFilesBuildPhase) {
    myProj.hash.project.objects.PBXCopyFilesBuildPhase = {};
}
myProj.hash.project.objects.PBXCopyFilesBuildPhase[copyFilesUuid] = {
    isa: 'PBXCopyFilesBuildPhase',
    buildActionMask: 2147483647,
    dstPath: '""',
    dstSubfolderSpec: 13,
    files: [
        { value: buildFileUuid, comment: 'StockWidgetExtension.appex in Embed App Extensions' }
    ],
    name: '"Embed App Extensions"',
    runOnlyForDeploymentPostprocessing: 0
};
myProj.hash.project.objects.PBXCopyFilesBuildPhase[copyFilesUuid + '_comment'] = 'Embed App Extensions';

const appTarget = myProj.pbxNativeTargetSection()[appTargetKey];
appTarget.buildPhases.push({ value: copyFilesUuid, comment: 'Embed App Extensions' });

// Write back
fs.writeFileSync(projectPath, myProj.writeSync());
console.log('Successfully configured iOS StockWidget Extension in App.xcodeproj!');
