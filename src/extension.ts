// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {Global} from './global';
import CompletionItemProvider from './features/completionItemProvider'
import DefinitionProvider from './features/definitionProvider'
import DocumentSymbolProvider from './features/documentSymbolProvider'
import ReferenceProvider from './features/referenceProvider'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "code-gnu-global" is now active!'); 

    var configuration = vscode.workspace.getConfiguration('codegnuglobal');
    var executableGlobal = configuration.get<string>('executables.global', 'global');
    var executableGtags = configuration.get<string>('executables.gtags', 'gtags');

    const enableCompletionItemProvider = configuration.get<Boolean>('providers.completion', true);
    const enableDefinitionProvider = configuration.get<Boolean>('providers.definition', true);
    const enableDocumentSymbolProvider = configuration.get<Boolean>('providers.symbol', true);
    const enableReferenceProvider = configuration.get<Boolean>('providers.reference', true);
    const useCompileCommandsJson = configuration.get<Boolean>('compile_commands.enable', false);
    const compileCommandsJson = configuration.get<string>('compile_commands.json', 'compile_commands.json');

    const global = new Global(executableGlobal, executableGtags, useCompileCommandsJson, compileCommandsJson);
    if (enableCompletionItemProvider)
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(['cpp', 'c'], new CompletionItemProvider(global), '.', '>'));
    if (enableDefinitionProvider)
        context.subscriptions.push(vscode.languages.registerDefinitionProvider(['cpp', 'c'], new DefinitionProvider(global)));
    if (enableDocumentSymbolProvider)
        context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(['cpp', 'c'], new DocumentSymbolProvider(global)));
    if (enableReferenceProvider)
        context.subscriptions.push(vscode.languages.registerReferenceProvider(['cpp', 'c'], new ReferenceProvider(global)));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(d => global.updateTags()));

    var updateTags =((global) => {
        global.updateTags();
    })(global);

    let boundUpdatetags = global.updateTags.bind(global);

    const buildDataBaseCmd = vscode.commands.registerCommand('extension.build_database', () => {
        boundUpdatetags();
    })
}
