var exec = require('child-process-promise').exec;
var iconv = require('iconv-lite');
var path = require('path');
var fs = require('fs');
var glob = require('glob');

import * as vscode from 'vscode';

function execute(command: string): Promise<Buffer> {
    var configuration = vscode.workspace.getConfiguration('codegnuglobal');
    var encoding = configuration.get<string>('encoding');
    var output = 'utf8';
    if (encoding != null && encoding != "") {
        output = 'binary';
    }
    return exec(command, {
        cwd: vscode.workspace.rootPath,
        encoding: output,
        maxBuffer: 10*1024*1024
    }).then(function(result): Buffer {
        if (encoding != null && encoding != "") {
            var decoded = iconv.decode(result.stdout, encoding);
            return decoded;
        }
        return result.stdout;
    }).fail(function(error) {
        console.error("Error: " + error);
    }).progress(function(childProcess) {
        console.log("Command: " + command + " running...");
    });
};

export class Global {
    execGlobal: string;
    execGtags: string;
    useCompileCommands: Boolean;
    compileCommandsJson: string;
    gtagsFile: string;

    run(params: string[]): Promise<Buffer> {
        return execute(this.execGlobal + ' ' + params.join(' '));
    }

    buildDataBase()
    {
        let compileCommandsText = fs.readFileSync(this.compileCommandsJson);
        let compileCommands = JSON.parse(compileCommandsText);
        const reInclude = /-I([^\s]*)/g;

        let includeDirs = {};

        fs.writeFileSync(this.gtagsFile, '');

        compileCommands.forEach((cu) => {
            fs.appendFileSync(this.gtagsFile, cu.file + '\n');

            let match;
            while (match = reInclude.exec(cu.command))
            {
                includeDirs[match[1]] = 1;
            }
        });

        let includeFiles = {};

        for (var dir in includeDirs)
        {
            let files = glob.sync("**/*.{h,hpp}", {cwd : dir, realpath: true});
            files.forEach((file) =>
            {
                includeFiles[file] = 1;
            });
        }

        for (var file in includeFiles)
        {
            fs.appendFileSync(this.gtagsFile, file + '\n');
        }
        return execute(this.execGtags + ' -f ' + this.gtagsFile);
    }

    updateTags() {
        var configuration = vscode.workspace.getConfiguration('codegnuglobal');
        var shouldupdate = configuration.get<boolean>('autoupdate', true);
        var useCompileCommands = configuration.get<Boolean>('compile_commands.enable', false);

        if (shouldupdate && !useCompileCommands) {
            this.run(['-u']);
        }
        else if (useCompileCommands)
        {
            try {
                this.buildDataBase();
            } catch(err) {
                console.log('Error building data base: ' + err);
            }
        }
    }

    parseLine(content: string): any {
        try {
            if (content == null || content == "") return null;

            var values = content.split(/ +/);
            var tag = values.shift();
            var line = parseInt(values.shift()) - 1;
            var path = values.shift().replace("%20", " ");
            var info = values.join(' ');

            return { "tag": tag, "line": line, "path": path, "info": info, "kind": this.parseKind(info) };
        } catch (ex) {
            console.error("Error: " + ex);
        }
        return null;
    }

    private parseKind(info: string): vscode.SymbolKind {
        var kind = vscode.SymbolKind.Variable;

        if (info.startsWith('class ')) {
            kind = vscode.SymbolKind.Class;
        } else if (info.startsWith('struct ')) {
            kind = vscode.SymbolKind.Class;
        } else if (info.startsWith('enum ')) {
            kind = vscode.SymbolKind.Enum;
        } else if (info.indexOf('(') != -1) {
            kind = vscode.SymbolKind.Function;
        }
        return kind;
    }

    constructor(execGlobal: string, execGtags: string, useCompileCommands: Boolean, compileCommandsJson: string) {
        this.execGlobal = execGlobal;
        this.execGtags = execGtags;
        this.useCompileCommands = useCompileCommands;
        this.compileCommandsJson = compileCommandsJson;
        this.gtagsFile = path.join(vscode.workspace.rootPath, '.vscode', 'gtags.files');
    }
}
