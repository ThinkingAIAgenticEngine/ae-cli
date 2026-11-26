import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.endsWith("...")) {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        previous.push(value);
        return previous;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._collectValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.minWidthToWrap = 40;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
       * and just before calling `formatHelp()`.
       *
       * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
       *
       * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
       */
      prepareContext(contextOptions) {
        this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions2 = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions2.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions2.sort(this.compareOptions);
        }
        return globalOptions2;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleSubcommandTerm(helper.subcommandTerm(command))
            )
          );
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleArgumentTerm(helper.argumentTerm(argument))
            )
          );
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (option.description) {
            return `${option.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return argument.description;
      }
      /**
       * Format a list of items, given a heading and an array of formatted items.
       *
       * @param {string} heading
       * @param {string[]} items
       * @param {Help} helper
       * @returns string[]
       */
      formatItemList(heading, items, helper) {
        if (items.length === 0) return [];
        return [helper.styleTitle(heading), ...items, ""];
      }
      /**
       * Group items by their help group heading.
       *
       * @param {Command[] | Option[]} unsortedItems
       * @param {Command[] | Option[]} visibleItems
       * @param {Function} getGroup
       * @returns {Map<string, Command[] | Option[]>}
       */
      groupItems(unsortedItems, visibleItems, getGroup) {
        const result = /* @__PURE__ */ new Map();
        unsortedItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) result.set(group, []);
        });
        visibleItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) {
            result.set(group, []);
          }
          result.get(group).push(item);
        });
        return result;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth ?? 80;
        function callFormatItem(term, description) {
          return helper.formatItem(term, termWidth, description, helper);
        }
        let output = [
          `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
          ""
        ];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.boxWrap(
              helper.styleCommandDescription(commandDescription),
              helpWidth
            ),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return callFormatItem(
            helper.styleArgumentTerm(helper.argumentTerm(argument)),
            helper.styleArgumentDescription(helper.argumentDescription(argument))
          );
        });
        output = output.concat(
          this.formatItemList("Arguments:", argumentList, helper)
        );
        const optionGroups = this.groupItems(
          cmd.options,
          helper.visibleOptions(cmd),
          (option) => option.helpGroupHeading ?? "Options:"
        );
        optionGroups.forEach((options, group) => {
          const optionList = options.map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(this.formatItemList(group, optionList, helper));
        });
        if (helper.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(
            this.formatItemList("Global Options:", globalOptionList, helper)
          );
        }
        const commandGroups = this.groupItems(
          cmd.commands,
          helper.visibleCommands(cmd),
          (sub) => sub.helpGroup() || "Commands:"
        );
        commandGroups.forEach((commands2, group) => {
          const commandList = commands2.map((sub) => {
            return callFormatItem(
              helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
              helper.styleSubcommandDescription(helper.subcommandDescription(sub))
            );
          });
          output = output.concat(this.formatItemList(group, commandList, helper));
        });
        return output.join("\n");
      }
      /**
       * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
       *
       * @param {string} str
       * @returns {number}
       */
      displayWidth(str) {
        return stripColor(str).length;
      }
      /**
       * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
       *
       * @param {string} str
       * @returns {string}
       */
      styleTitle(str) {
        return str;
      }
      styleUsage(str) {
        return str.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word === "[command]") return this.styleSubcommandText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleCommandText(word);
        }).join(" ");
      }
      styleCommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleOptionDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleSubcommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleArgumentDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleDescriptionText(str) {
        return str;
      }
      styleOptionTerm(str) {
        return this.styleOptionText(str);
      }
      styleSubcommandTerm(str) {
        return str.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleSubcommandText(word);
        }).join(" ");
      }
      styleArgumentTerm(str) {
        return this.styleArgumentText(str);
      }
      styleOptionText(str) {
        return str;
      }
      styleArgumentText(str) {
        return str;
      }
      styleSubcommandText(str) {
        return str;
      }
      styleCommandText(str) {
        return str;
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
       *
       * @param {string} str
       * @returns {boolean}
       */
      preformatted(str) {
        return /\n[^\S\r\n]/.test(str);
      }
      /**
       * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
       *
       * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
       *   TTT  DDD DDDD
       *        DD DDD
       *
       * @param {string} term
       * @param {number} termWidth
       * @param {string} description
       * @param {Help} helper
       * @returns {string}
       */
      formatItem(term, termWidth, description, helper) {
        const itemIndent = 2;
        const itemIndentStr = " ".repeat(itemIndent);
        if (!description) return itemIndentStr + term;
        const paddedTerm = term.padEnd(
          termWidth + term.length - helper.displayWidth(term)
        );
        const spacerWidth = 2;
        const helpWidth = this.helpWidth ?? 80;
        const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
        let formattedDescription;
        if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
          formattedDescription = description;
        } else {
          const wrappedDescription = helper.boxWrap(description, remainingWidth);
          formattedDescription = wrappedDescription.replace(
            /\n/g,
            "\n" + " ".repeat(termWidth + spacerWidth)
          );
        }
        return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
      }
      /**
       * Wrap a string at whitespace, preserving existing line breaks.
       * Wrapping is skipped if the width is less than `minWidthToWrap`.
       *
       * @param {string} str
       * @param {number} width
       * @returns {string}
       */
      boxWrap(str, width2) {
        if (width2 < this.minWidthToWrap) return str;
        const rawLines = str.split(/\r\n|\n/);
        const chunkPattern = /[\s]*[^\s]+/g;
        const wrappedLines = [];
        rawLines.forEach((line) => {
          const chunks = line.match(chunkPattern);
          if (chunks === null) {
            wrappedLines.push("");
            return;
          }
          let sumChunks = [chunks.shift()];
          let sumWidth = this.displayWidth(sumChunks[0]);
          chunks.forEach((chunk) => {
            const visibleWidth = this.displayWidth(chunk);
            if (sumWidth + visibleWidth <= width2) {
              sumChunks.push(chunk);
              sumWidth += visibleWidth;
              return;
            }
            wrappedLines.push(sumChunks.join(""));
            const nextChunk = chunk.trimStart();
            sumChunks = [nextChunk];
            sumWidth = this.displayWidth(nextChunk);
          });
          wrappedLines.push(sumChunks.join(""));
        });
        return wrappedLines.join("\n");
      }
    };
    function stripColor(str) {
      const sgrPattern = /\x1b\[\d*(;\d*)*m/g;
      return str.replace(sgrPattern, "");
    }
    exports.Help = Help2;
    exports.stripColor = stripColor;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
        this.helpGroupHeading = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        previous.push(value);
        return previous;
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._collectValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as an object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        if (this.negate) {
          return camelcase(this.name().replace(/^no-/, ""));
        }
        return camelcase(this.name());
      }
      /**
       * Set the help group heading.
       *
       * @param {string} heading
       * @return {Option}
       */
      helpGroup(heading) {
        this.helpGroupHeading = heading;
        return this;
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => {
        return str2 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const shortFlagExp = /^-[^-]$/;
      const longFlagExp = /^--[^-]/;
      const flagParts = flags.split(/[ |,]+/).concat("guard");
      if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
      if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
      if (!shortFlag && shortFlagExp.test(flagParts[0]))
        shortFlag = flagParts.shift();
      if (!shortFlag && longFlagExp.test(flagParts[0])) {
        shortFlag = longFlag;
        longFlag = flagParts.shift();
      }
      if (flagParts[0].startsWith("-")) {
        const unsupportedFlag = flagParts[0];
        const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
        if (/^-[^-][^-]/.test(unsupportedFlag))
          throw new Error(
            `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
          );
        if (shortFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many short flags`);
        if (longFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many long flags`);
        throw new Error(`${baseError}
- unrecognised flag format`);
      }
      if (shortFlag === void 0 && longFlag === void 0)
        throw new Error(
          `option creation failed due to no flags found in '${flags}'.`
        );
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports) {
    var EventEmitter = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path = __require("node:path");
    var fs = __require("node:fs");
    var process2 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2, stripColor } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = false;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._savedState = null;
        this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          outputError: (str, write) => write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          getOutHasColors: () => useColor() ?? (process2.stdout.isTTY && process2.stdout.hasColors?.()),
          getErrHasColors: () => useColor() ?? (process2.stderr.isTTY && process2.stderr.hasColors?.()),
          stripColor: (str) => stripColor(str)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
        this._helpGroupHeading = void 0;
        this._defaultCommandGroup = void 0;
        this._defaultOptionGroup = void 0;
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // change how output being written, defaults to stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // change how output being written for errors, defaults to writeErr
       *     outputError(str, write) // used for displaying errors and not used for displaying help
       *     // specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // color support, currently only used with Help
       *     getOutHasColors()
       *     getErrHasColors()
       *     stripColor() // used to remove ANSI escape codes if output does not have colors
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        this._outputConfiguration = {
          ...this._outputConfiguration,
          ...configuration
        };
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom argument processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, parseArg, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof parseArg === "function") {
          argument.default(defaultValue).argParser(parseArg);
        } else {
          argument.default(parseArg);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument?.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          if (enableOrNameAndArgs && this._defaultCommandGroup) {
            this._initCommandGroup(this._getHelpCommand());
          }
          return this;
        }
        const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        this._initCommandGroup(helpCommand);
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this._initOptionGroup(option);
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this._initCommandGroup(command);
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._collectValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process2.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process2.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process2.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      _prepareForParse() {
        if (this._savedState === null) {
          this.saveStateBeforeParse();
        } else {
          this.restoreStateBeforeParse();
        }
      }
      /**
       * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state saved.
       */
      saveStateBeforeParse() {
        this._savedState = {
          // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
          _name: this._name,
          // option values before parse have default values (including false for negated options)
          // shallow clones
          _optionValues: { ...this._optionValues },
          _optionValueSources: { ...this._optionValueSources }
        };
      }
      /**
       * Restore state before parse for calls after the first.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state restored.
       */
      restoreStateBeforeParse() {
        if (this._storeOptionsAsProperties)
          throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
        this._name = this._savedState._name;
        this._scriptPath = null;
        this.rawArgs = [];
        this._optionValues = { ...this._savedState._optionValues };
        this._optionValueSources = { ...this._savedState._optionValueSources };
        this.args = [];
        this.processedArgs = [];
      }
      /**
       * Throw if expected executable is missing. Add lots of help for author.
       *
       * @param {string} executableFile
       * @param {string} executableDir
       * @param {string} subcommandName
       */
      _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
        if (fs.existsSync(executableFile)) return;
        const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          this._checkForMissingExecutable(
            executableFile,
            executableDir,
            subcommand._name
          );
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process2.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            this._checkForMissingExecutable(
              executableFile,
              executableDir,
              subcommand._name
            );
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName2, operands, unknown) {
        const subCommand = this._findCommand(commandName2);
        if (!subCommand) this.help({ error: true });
        subCommand._prepareForParse();
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise?.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent?.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Side effects: modifies command by storing options. Does not reset state if called again.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} args
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(args) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        const negativeNumberArg = (arg) => {
          if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
          return !this._getCommandAndAncestors().some(
            (cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short))
          );
        };
        let activeVariadicOption = null;
        let activeGroup = null;
        let i = 0;
        while (i < args.length || activeGroup) {
          const arg = activeGroup ?? args[i++];
          activeGroup = null;
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args.slice(i));
            break;
          }
          if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args[i++];
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
                  value = args[i++];
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                activeGroup = `-${arg.slice(2)}`;
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              unknown.push(...args.slice(i));
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg, ...args.slice(i));
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg, ...args.slice(i));
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg, ...args.slice(i));
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0) return this._version;
        this._version = str;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`);
          this._exit(0, "commander.version", str);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str, argsDescription) {
        if (str === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str) {
        if (str === void 0) return this._summary;
        this._summary = str;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str) {
        if (str === void 0) return this._name;
        this._name = str;
        return this;
      }
      /**
       * Set/get the help group heading for this subcommand in parent command's help.
       *
       * @param {string} [heading]
       * @return {Command | string}
       */
      helpGroup(heading) {
        if (heading === void 0) return this._helpGroupHeading ?? "";
        this._helpGroupHeading = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for subcommands added to this command.
       * (This does not override a group set directly on the subcommand using .helpGroup().)
       *
       * @example
       * program.commandsGroup('Development Commands:);
       * program.command('watch')...
       * program.command('lint')...
       * ...
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      commandsGroup(heading) {
        if (heading === void 0) return this._defaultCommandGroup ?? "";
        this._defaultCommandGroup = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for options added to this command.
       * (This does not override a group set directly on the option using .helpGroup().)
       *
       * @example
       * program
       *   .optionsGroup('Development Options:')
       *   .option('-d, --debug', 'output extra debugging')
       *   .option('-p, --profile', 'output profiling information')
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      optionsGroup(heading) {
        if (heading === void 0) return this._defaultOptionGroup ?? "";
        this._defaultOptionGroup = heading;
        return this;
      }
      /**
       * @param {Option} option
       * @private
       */
      _initOptionGroup(option) {
        if (this._defaultOptionGroup && !option.helpGroupHeading)
          option.helpGroup(this._defaultOptionGroup);
      }
      /**
       * @param {Command} cmd
       * @private
       */
      _initCommandGroup(cmd) {
        if (this._defaultCommandGroup && !cmd.helpGroup())
          cmd.helpGroup(this._defaultCommandGroup);
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        if (path2 === void 0) return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        const context = this._getOutputContext(contextOptions);
        helper.prepareContext({
          error: context.error,
          helpWidth: context.helpWidth,
          outputHasColors: context.hasColors
        });
        const text = helper.formatHelp(this, helper);
        if (context.hasColors) return text;
        return this._outputConfiguration.stripColor(text);
      }
      /**
       * @typedef HelpContext
       * @type {object}
       * @property {boolean} error
       * @property {number} helpWidth
       * @property {boolean} hasColors
       * @property {function} write - includes stripColor if needed
       *
       * @returns {HelpContext}
       * @private
       */
      _getOutputContext(contextOptions) {
        contextOptions = contextOptions || {};
        const error = !!contextOptions.error;
        let baseWrite;
        let hasColors;
        let helpWidth;
        if (error) {
          baseWrite = (str) => this._outputConfiguration.writeErr(str);
          hasColors = this._outputConfiguration.getErrHasColors();
          helpWidth = this._outputConfiguration.getErrHelpWidth();
        } else {
          baseWrite = (str) => this._outputConfiguration.writeOut(str);
          hasColors = this._outputConfiguration.getOutHasColors();
          helpWidth = this._outputConfiguration.getOutHelpWidth();
        }
        const write = (str) => {
          if (!hasColors) str = this._outputConfiguration.stripColor(str);
          return baseWrite(str);
        };
        return { error, write, hasColors, helpWidth };
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const outputContext = this._getOutputContext(contextOptions);
        const eventContext = {
          error: outputContext.error,
          write: outputContext.write,
          command: this
        };
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
        this.emit("beforeHelp", eventContext);
        let helpInformation = this.helpInformation({ error: outputContext.error });
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        outputContext.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", eventContext);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", eventContext)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            if (this._helpOption === null) this._helpOption = void 0;
            if (this._defaultOptionGroup) {
              this._initOptionGroup(this._getHelpOption());
            }
          } else {
            this._helpOption = null;
          }
          return this;
        }
        this._helpOption = this.createOption(
          flags ?? "-h, --help",
          description ?? "display help for command"
        );
        if (flags || description) this._initOptionGroup(this._helpOption);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        this._initOptionGroup(option);
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = Number(process2.exitCode ?? 0);
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * // Do a little typing to coordinate emit and listener for the help text events.
       * @typedef HelpTextEventContext
       * @type {object}
       * @property {boolean} error
       * @property {Command} command
       * @property {function} write
       */
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    function useColor() {
      if (process2.env.NO_COLOR || process2.env.FORCE_COLOR === "0" || process2.env.FORCE_COLOR === "false")
        return false;
      if (process2.env.FORCE_COLOR || process2.env.CLICOLOR_FORCE !== void 0)
        return true;
      return void 0;
    }
    exports.Command = Command2;
    exports.useColor = useColor;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// src/core/errors.mjs
var CliError = class extends Error {
  /** @param {string} code @param {string} message @param {string} [chinese] */
  constructor(code, message, chinese = message) {
    super(message);
    this.locale;
    this.http_status;
    this.rpc_code;
    this.tool_code;
    this.operation_may_have_completed;
    this.job_id;
    this.status;
    this.code = code;
    this.chinese = chinese;
  }
};
var fail = (code, message, chinese) => {
  throw new CliError(code, message, chinese);
};

// src/core/cancellation.mjs
function cancelledError() {
  return new CliError("CANCELLED", "Local operation cancelled. Server work may already have completed; inspect its state before retrying.", "\u672C\u5730\u64CD\u4F5C\u5DF2\u505C\u6B62\uFF1B\u670D\u52A1\u7AEF\u64CD\u4F5C\u53EF\u80FD\u5DF2\u7ECF\u5B8C\u6210\uFF0C\u8BF7\u5148\u6838\u5BF9\u72B6\u6001\u518D\u51B3\u5B9A\u662F\u5426\u91CD\u8BD5\u3002");
}
function assertActive(signal) {
  if (signal?.aborted) throw cancelledError();
}
function deadline(milliseconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Deadline exceeded", "TimeoutError")), milliseconds);
  timer.unref();
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}
async function abortable(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) {
    promise.catch(() => {
    });
    throw cancelledError();
  }
  let cancel;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      cancel = () => reject(cancelledError());
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
    })]);
  } finally {
    if (cancel) signal.removeEventListener("abort", cancel);
  }
}
async function sleep(milliseconds, signal) {
  assertActive(signal);
  let timer;
  try {
    await abortable(new Promise((resolve2) => {
      timer = setTimeout(resolve2, milliseconds);
    }), signal);
  } finally {
    clearTimeout(timer);
  }
}
function runScope(parent, fetcher = fetch) {
  const controller = new AbortController();
  const signal = parent ? AbortSignal.any([parent, controller.signal]) : controller.signal;
  const scopedFetch = (
    /** @type {typeof fetch} */
    ((url, options) => {
      assertActive(signal);
      return fetcher(url, { ...options, signal: options?.signal ? AbortSignal.any([signal, options.signal]) : signal });
    })
  );
  return { signal, fetcher: scopedFetch, close: () => controller.abort() };
}

// src/app.mjs
import { homedir } from "node:os";
import { join as join3 } from "node:path";
import { rm as rm3 } from "node:fs/promises";

// src/core/paths.mjs
var packageRoot = new URL("./", import.meta.url);

// src/core/runtime.mjs
import { readFile } from "node:fs/promises";
var manifest = JSON.parse(await readFile(new URL("package.json", packageRoot), "utf8"));
var VERSION = manifest.version;
var DEFAULT_ENDPOINT = "https://ta.heari.ai/mcp";
var pick = (locale, zh, en) => locale === "en-US" ? en : zh;
var isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/command/definitions.mjs
var string = { type: "string" };
function registerCommands(register) {
  register("schema", {
    policy: { effects: [], confirmation: "none", retry: "local-read", authentication: "not-required-to-invoke" },
    description: ["\u8BFB\u53D6 CLI \u547D\u4EE4\u4E0E\u5B89\u5168\u8C03\u7528\u5951\u7EA6\uFF0C\u65E0\u9700\u767B\u5F55", "Read CLI commands and invocation contracts without signing in"],
    options: { command: { ...string, valueName: "NAME", description: ['\u4EC5\u663E\u793A\u6307\u5B9A\u547D\u4EE4\uFF0C\u4F8B\u5982 "reports export"', 'Show one command, for example "reports export"'] } },
    examples: ["heari schema", 'heari schema --command "reports export" --lang en-US'],
    notes: [["\u8FD9\u662F\u5F53\u524D CLI \u7684\u8C03\u7528\u8BF4\u660E\uFF0C\u4E0D\u4EE3\u8868\u670D\u52A1\u7AEF\u6388\u6743\u6216\u5B8C\u6574\u4E1A\u52A1 schema\u3002", "Describes this CLI; does not establish server authorization or full business schemas."], ["\u90E8\u5206\u547D\u4EE4\u63D0\u4F9B result.schema\u3001\u5B8C\u6210\u5224\u636E\u548C\u6837\u4F8B\uFF1B\u9519\u8BEF\u5951\u7EA6\u89C1 error_result\u3002\u9000\u51FA0\u540E\u4ECD\u987B\u68C0\u67E5\u4E1A\u52A1\u72B6\u6001\u3002", "Selected commands include result.schema, completion criteria and examples; see error_result for errors. Check business state even after exit 0."]]
  });
  register("skills install", {
    policy: { effects: ["conditional-local-skill-write"], confirmation: "confirm-flag", retry: "inspect-before-retry", authentication: "not-required-to-invoke" },
    description: ["\u9884\u89C8\u6216\u5B89\u88C5\u968F\u5305\u63D0\u4F9B\u7684 Agent \u6280\u80FD\uFF0C\u65E0\u9700\u767B\u5F55", "Preview or install bundled agent skills without signing in"],
    required: ["agent"],
    constraints: [
      { flag: "agent", enum: ["codex", "claude-code", "cursor"] },
      { flag: "skill", enum: ["all", "heari-research", "heari-cli"] }
    ],
    options: {
      agent: { ...string, valueName: "AGENT", description: ["\u76EE\u6807 Agent\uFF1Acodex\u3001claude-code\u3001cursor", "Target agent: codex, claude-code, cursor"] },
      skill: { ...string, valueName: "NAME", description: ["\u6280\u80FD\uFF1Aheari-research\uFF08\u9ED8\u8BA4\uFF09", "Skill: heari-research (default)"] },
      directory: { ...string, valueName: "DIR", description: ["\u6280\u80FD\u76EE\u5F55\u7684\u7236\u76EE\u5F55\uFF0C\u8986\u76D6 Agent \u9ED8\u8BA4\u4F4D\u7F6E", "Parent directory for skills; overrides the agent default location"] },
      confirm: { type: "boolean", description: ["\u786E\u8BA4\u672C\u673A\u5B89\u88C5\uFF0C\u4E0D\u8986\u76D6\u5DF2\u6709\u76EE\u5F55", "Confirm local installation without replacing existing directories"] }
    },
    examples: ["heari skills install --agent codex", "heari skills install --agent claude-code --confirm"],
    notes: [["\u4EC5\u5B89\u88C5 heari-research\u3002\u9ED8\u8BA4\u9884\u89C8\uFF0C--confirm \u624D\u5199\u5165\uFF1B\u4E0D\u767B\u5F55\u3001\u4E0D\u4E0A\u4F20\u3001\u4E0D\u8986\u76D6\u5DF2\u6709\u76EE\u5F55\u3002", "Installs only heari-research. Preview by default; --confirm writes files. No login, upload or overwrite."]]
  });
  register("auth status", {
    policy: { effects: ["optional-remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "not-required-to-invoke" },
    description: ["\u68C0\u67E5\u51ED\u636E\u72B6\u6001\uFF1B\u53EF\u9009\u9A8C\u8BC1\u53EA\u8BFB\u8BBF\u95EE\uFF0C\u4E0D\u5237\u65B0\u6216\u4FDD\u5B58\u51ED\u636E", "Inspect credentials; optionally verify read access without refreshing or saving"],
    options: { online: { type: "boolean", description: ["\u8054\u7F51\u9A8C\u8BC1\u53EA\u8BFB\u8BBF\u95EE\uFF1B\u4E0D\u67E5\u8BE2\u4E2A\u4EBA\u8D44\u6599\u6216\u5237\u65B0\u51ED\u636E", "Verify read access online without fetching a profile or refreshing credentials"] } },
    examples: ["heari auth status", "heari auth status --online --no-input"],
    notes: [["\u9ED8\u8BA4\u4E0D\u8054\u7F51\uFF0Cauthenticated \u4E3A null\uFF1B\u8054\u7F51\u5931\u8D25\u4E0D\u4E00\u5B9A\u8868\u793A\u51ED\u636E\u88AB\u62D2\u7EDD\u3002", "Offline authenticated is null; an online failure does not necessarily mean credentials were rejected."]]
  });
  register("doctor", {
    policy: { effects: ["optional-remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "not-required-to-invoke" },
    description: ["\u8BCA\u65AD\u672C\u673A\u73AF\u5883\uFF0C\u53EF\u9009\u8054\u7F51\u9A8C\u8BC1\u53EA\u8BFB\u8BBF\u95EE", "Diagnose local setup; optionally verify online read access"],
    options: { online: { type: "boolean", description: ["\u8054\u7F51\u68C0\u67E5\u670D\u52A1\u3001\u5DE5\u5177\u540D\u79F0\u53CA\u53EA\u8BFB\u8BBF\u95EE\uFF1B\u4E0D\u5237\u65B0\u51ED\u636E", "Check the service, tool names and read access online; never refresh credentials"] } },
    examples: ["heari doctor", "heari doctor --online --format table", "heari doctor --online --no-input"],
    notes: [["\u9ED8\u8BA4\u4EC5\u672C\u673A\u68C0\u67E5\uFF1B\u8054\u7F51\u603B\u9884\u7B9710\u79D2\u3002\u8BCA\u65AD\u4E0D\u66F4\u65B0CLI\u3001\u4E0D\u5199\u914D\u7F6E\u3001\u4E0D\u5237\u65B0\u4EE4\u724C\u3002", "Local-only by default; online checks share a 10-second budget. No CLI update, config writes or token refresh."], ["\u68C0\u67E5\u62A5\u544A\u8F93\u51FA\u5230stdout\uFF1B\u5B58\u5728FAIL\u9000\u51FA1\uFF0C\u65E0FAIL\u9000\u51FA0\uFF0CWARN/SKIP\u4E0D\u7B49\u4E8E\u5168\u90E8\u5DF2\u9A8C\u8BC1\u3002", "Reports go to stdout; FAIL exits 1, otherwise 0. WARN/SKIP do not establish full verification."]]
  });
  register("update", {
    policy: { effects: ["remote-registry-read", "conditional-local-install"], confirmation: "confirm-flag-or-terminal-prompt", retry: "inspect-before-retry", authentication: "not-required-to-invoke" },
    constraints: [{ mutually_exclusive: [["check", "confirm"]], message: ["--check \u4E0D\u80FD\u4E0E --confirm \u540C\u7528\u3002", "--check cannot be combined with --confirm."] }],
    description: ["\u68C0\u67E5\u5E76\u5B89\u88C5\u6700\u65B0\u7A33\u5B9A\u7248", "Check for and install the latest stable version"],
    options: {
      check: { type: "boolean", description: ["\u4EC5\u68C0\u67E5\u66F4\u65B0\uFF0C\u4E0D\u5B89\u88C5", "Check for updates without installing"] },
      confirm: { type: "boolean", description: ["\u786E\u8BA4\u5B89\u88C5\u68C0\u67E5\u5230\u7684\u7248\u672C\uFF1B\u9002\u7528\u4E8E\u975E\u4EA4\u4E92\u8C03\u7528", "Confirm installation of the checked version; supports non-interactive use"] }
    },
    examples: ["heari update", "heari update --check", "heari update --no-input --confirm"],
    notes: [
      ["\u65E0\u9700\u767B\u5F55\uFF1B\u4ECE\u5B98\u65B9 npm \u6CE8\u518C\u8868\u68C0\u67E5\u7A33\u5B9A\u7248\uFF0C\u4E0D\u81EA\u52A8\u964D\u7EA7\u3002", "No login required; checks the official npm registry for a stable release without downgrading."],
      ["\u4EA4\u4E92\u7EC8\u7AEF\u786E\u8BA4\u540E\u5B89\u88C5\uFF1B\u811A\u672C\u9ED8\u8BA4\u53EA\u9884\u89C8\uFF0C\u9700 --confirm \u624D\u5B89\u88C5\u3002", "Prompts before installation in a terminal; scripts preview unless --confirm is supplied."],
      ["\u4EC5\u81EA\u52A8\u66F4\u65B0\u5F53\u524D npm \u5168\u5C40\u5B89\u88C5\uFF1B\u4FDD\u7559\u767B\u5F55\u914D\u7F6E\uFF0C\u4E0D\u81EA\u52A8\u63D0\u6743\u3002\u5176\u4ED6\u5B89\u88C5\u65B9\u5F0F\u8BF7\u4F7F\u7528\u539F\u5B89\u88C5\u5DE5\u5177\u66F4\u65B0\u3002", "Automatically updates only the current global npm installation; retains sign-in settings and never elevates privileges. Use your original installer for other installations."]
    ]
  });
  register("login", { "policy": { "effects": ["remote-authentication", "local-credentials-write"], "confirmation": "none", "retry": "inspect-before-retry", "authentication": "not-required-to-invoke" }, "description": ["\u4F7F\u7528\u5F53\u524D AE \u8D26\u53F7\u767B\u5F55\u6B64\u73AF\u5883\u7ED1\u5B9A\u7684 HearI", "Sign in to the HearI workspace registered with the current AE environment"], "options": { "endpoint": { "type": "string", "valueName": "URL", "description": ["\u53EF\u9009\uFF0C\u6838\u5BF9\u9884\u671F HearI \u5730\u5740", "Optional expected HearI endpoint"] }, "no-browser": { "type": "boolean", "description": ["\u517C\u5BB9\u65E7\u547D\u4EE4\uFF1BAE \u6362\u7968\u59CB\u7EC8\u65E0\u9700\u6D4F\u89C8\u5668", "Compatibility flag; AE ticket exchange always runs without a browser"] }, "token-stdin": { "type": "boolean", "description": ["\u4ECE\u6807\u51C6\u8F93\u5165\u8BFB\u53D6\u72EC\u7ACB\u4EE4\u724C\uFF0C\u987B\u6307\u5B9A\u5BF9\u5E94 MCP \u5730\u5740", "Read an independent token from stdin with its explicit MCP endpoint"] } }, "examples": ["ae-cli heari login", "ae-cli heari studies list --no-input"], "notes": [["\u9996\u5148\u767B\u5F55\u5F53\u524D AE\u3002\u666E\u901A\u8BFB\u53D6\u81EA\u52A8\u6362\u53D6\u672C\u6B21\u53EA\u8BFB\u51ED\u636E\u3002", "Sign in to AE first. Reads automatically obtain a short-lived credential from the registered HearI workspace."]] });
  register("logout", {
    policy: { effects: ["local-credentials-delete"], confirmation: "none", retry: "local-delete", authentication: "not-required-to-invoke" },
    description: ["\u5220\u9664\u672C\u673A\u767B\u5F55\u51ED\u636E", "Remove locally saved credentials"],
    examples: ["heari logout"],
    notes: [["\u73AF\u5883\u4EE4\u724C\u4ECD\u6709\u6548\uFF1B\u64A4\u9500\u670D\u52A1\u7AEF\u4EE4\u724C\u8BF7\u524D\u5F80\u5DE5\u4F5C\u53F0\u3002", "Environment tokens remain active; revoke server tokens in the workbench."]]
  });
  register("tools", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u67E5\u770B\u670D\u52A1\u7AEF\u5DE5\u5177\u53CA\u53C2\u6570", "Discover server tools and their parameters"],
    examples: ["heari tools"],
    notes: [["\u9700\u8981\u767B\u5F55\uFF1B\u8BFB\u53D6 MCP tools/list\uFF0C\u4E0D\u4F1A\u6267\u884C\u6240\u5217\u5DE5\u5177\u3002", "Requires login; reads MCP tools/list without executing the listed tools."]]
  });
  register("research", {
    policy: { effects: ["model-inference", "conditional-remote-write"], confirmation: "confirm-flag-or-terminal-prompt", retry: "inspect-before-retry", authentication: "required" },
    constraints: [
      { when_present: "goal", min_trimmed_length: { goal: 1 }, message: ["--goal \u4E0D\u80FD\u4E3A\u7A7A\u3002", "--goal must not be blank."] },
      { when_present: "name", min_trimmed_length: { name: 1 }, message: ["--name \u4E0D\u80FD\u4E3A\u7A7A\u3002", "--name must not be blank."] },
      { requires_any: ["goal", "brief-file"], message: ["\u8BF7\u63D0\u4F9B --goal \u6216 --brief-file\u3002", "Provide --goal or --brief-file."] },
      { mutually_exclusive: [["goal", "brief-file"], ["answers-file", "brief-file"]], message: ["--brief-file \u4E0D\u80FD\u4E0E --goal \u6216 --answers-file \u540C\u7528\u3002", "--brief-file cannot be combined with --goal or --answers-file."] },
      { when: { confirm: true }, required: ["brief-file"], message: ["\u81EA\u52A8\u786E\u8BA4\u8BF7\u4F7F\u7528 --brief-file \u63D0\u4EA4\u5DF2\u5BA1\u9605\u7684\u9884\u89C8\uFF1B--goal \u4E0D\u4F1A\u7ED1\u5B9A\u4E0A\u6B21\u7B80\u62A5\u3002", "Confirm the reviewed preview with --brief-file; --goal does not bind a previous brief."] }
    ],
    description: ["\u6F84\u6E05\u7814\u7A76\u76EE\u6807\uFF0C\u786E\u8BA4\u540E\u521B\u5EFA\u65B9\u6848\u8349\u7A3F", "Clarify a research goal and confirm a draft"],
    options: {
      goal: { ...string, valueName: "TEXT", description: ["\u7814\u7A76\u76EE\u6807\u4E0E\u80CC\u666F", "Research goal and context"] },
      name: { ...string, valueName: "NAME", description: ["\u660E\u786E\u6307\u5B9A\u7814\u7A76\u540D\u79F0\uFF1B\u4FDD\u7559\u7B80\u62A5\u5176\u4ED6\u5185\u5BB9\uFF0C\u4E0D\u4FEE\u6539\u539F\u9884\u89C8\u6587\u4EF6", "Explicit study name; preserve other brief fields and the original preview file"] },
      "brief-file": { ...string, valueName: "FILE", description: ["\u5DF2\u5BA1\u9605\u7684\u7814\u7A76\u9884\u89C8 JSON\uFF1B\u4E0D\u91CD\u65B0\u751F\u6210\uFF0C\u4EC5\u53EF\u7528 --name \u663E\u5F0F\u66F4\u540D", "Reviewed research preview JSON; no regeneration, with an optional explicit --name change"] },
      "answers-file": { ...string, valueName: "FILE", description: ["\u6F84\u6E05\u56DE\u7B54 JSON \u6587\u4EF6\uFF1B\u6700\u591A 20 \u6761\u300164 KiB", "Answers JSON file; up to 20 entries, 64 KiB"] },
      confirm: { type: "boolean", description: ["\u786E\u8BA4\u5DF2\u5BA1\u9605\u7B80\u62A5\u53CA\u663E\u5F0F --name\uFF08\u82E5\u6709\uFF09\u5E76\u521B\u5EFA\u8349\u7A3F", "Confirm the reviewed brief and explicit --name, if supplied, and create a draft"] }
    },
    examples: [
      ['heari research --goal "\u4E86\u89E3\u7528\u6237\u4E3A\u4F55\u5728\u8BD5\u7528\u540E\u653E\u5F03\u8D2D\u4E70"', 'heari research --goal "Understand why users do not buy after a trial"'],
      ['heari research --goal "\u4E86\u89E3\u7528\u6237\u4E3A\u4F55\u5728\u8BD5\u7528\u540E\u653E\u5F03\u8D2D\u4E70" \\\n  --answers-file answers.json', 'heari research --goal "Understand why users do not buy after a trial" \\\n  --answers-file answers.json'],
      ['heari research --goal "\u4E86\u89E3\u7528\u6237\u4E3A\u4F55\u5728\u8BD5\u7528\u540E\u653E\u5F03\u8D2D\u4E70" \\\n  --answers-file answers.json > reviewed.json', 'heari research --goal "Understand why users do not buy after a trial" \\\n  --answers-file answers.json > reviewed.json'],
      "heari research --brief-file reviewed.json --confirm --no-input",
      'heari research --brief-file reviewed.json --name "Q3 Churn Analysis Draft" --confirm --no-input'
    ],
    notes: [
      ["\u4EC5\u8F93\u5165\u3001\u8F93\u51FA\u548C\u9519\u8BEF\u5747\u4E3A\u7EC8\u7AEF\u65F6\u4EA4\u4E92\uFF1B--no-input \u6216\u663E\u5F0F --format json \u7981\u7528\u4EA4\u4E92\u3002", "Prompts require all three streams to be terminals; --no-input or explicit --format json disables prompts."],
      ['\u56DE\u7B54\u6587\u4EF6\u683C\u5F0F\uFF1A[{"question":"...","answer":"..."}]\u3002', 'Answers file format: [{"question":"...","answer":"..."}].'],
      ["\u7528\u6237\u660E\u786E\u66F4\u540D\u65F6\u53EF\u52A0 --name\uFF1B\u5148\u6821\u9A8C\u539F\u9884\u89C8\uFF0C\u518D\u53EA\u66FF\u6362\u540D\u79F0\uFF0C\u4E0D\u91CD\u65B0\u751F\u6210\u7B80\u62A5\u3002\u672A\u52A0 --confirm \u65F6\u4ECD\u4EC5\u9884\u89C8\u3002", "Use --name for an explicitly requested name change. The original preview is validated first; only its name changes, without regenerating the brief. Omitting --confirm remains a preview."],
      ["\u53EA\u521B\u5EFA\u7814\u7A76\u4E0E\u63D0\u7EB2\u8349\u7A3F\uFF1B\u53EF\u7528 guide show/edit/apply \u7EE7\u7EED\u4FEE\u6539\uFF0C\u4E5F\u53EF\u5728\u7F51\u9875\u5BA1\u9605\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u53D1\u5E03\u6216\u62DB\u52DF\u3002", "Creates a study and guide draft; continue with guide show/edit/apply or review in the web workbench. Nothing is automatically published or recruited."]
    ]
  });
  register("contact", {
    policy: { effects: ["remote-read", "conditional-remote-write", "conditional-email"], confirmation: "confirm-flag", retry: "inspect-before-retry", authentication: "required" },
    constraints: [{ when: { confirm: true }, required: ["email"], message: ["--confirm \u5FC5\u987B\u540C\u65F6\u63D0\u4F9B --email\u3002", "--email is required with --confirm."] }],
    description: ["\u9884\u89C8\u3001\u63D0\u4EA4\u6216\u67E5\u8BE2\u56E2\u961F\u8054\u7CFB\u7533\u8BF7", "Preview, submit or check a team contact request"],
    id: true,
    options: {
      email: { ...string, valueName: "EMAIL", description: ["\u4F60\u7684\u56DE\u8BBF\u90AE\u7BB1\uFF1B\u4E0D\u662F\u56E2\u961F\u6536\u4EF6\u5730\u5740", "Your callback email, not the team recipient address"] },
      confirm: { type: "boolean", description: ["\u540C\u610F\u56E2\u961F\u8054\u7CFB\u5E76\u63D0\u4EA4\u7533\u8BF7\uFF1B\u5FC5\u987B\u540C\u65F6\u63D0\u4F9B --email", "Consent to contact and submit; requires --email"] }
    },
    examples: ["heari contact STUDY_UUID", "heari contact STUDY_UUID --email you@example.com", "heari contact STUDY_UUID --email you@example.com --confirm"],
    notes: [
      ["\u9ED8\u8BA4\u53EA\u67E5\u8BE2\u6216\u9884\u89C8\uFF1B--confirm \u4F1A\u63D0\u4EA4\u8054\u7CFB\u7533\u8BF7\uFF0C\u7531\u540E\u53F0\u53D1\u9001\u90AE\u4EF6\u3002", "Defaults to status or preview; --confirm submits a contact request for background email delivery."],
      ["\u91CD\u590D\u63D0\u4EA4\u8FD4\u56DE\u539F\u7533\u8BF7\uFF1BSENT \u4EC5\u8868\u793A SMTP \u5DF2\u63A5\u6536\uFF0C\u4E0D\u8868\u793A\u56E2\u961F\u5DF2\u56DE\u590D\u3002", "Repeated submissions return the original request; SENT means SMTP accepted it, not that the team replied."],
      ["\u4E0D\u4F1A\u53D1\u5E03\u7814\u7A76\u6216\u9080\u8BF7\u53D7\u8BBF\u8005\u3002", "Does not publish studies or invite participants."]
    ]
  });
  register("studies list", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u5217\u51FA\u6216\u641C\u7D22\u7814\u7A76\uFF0C\u83B7\u53D6\u7814\u7A76 ID", "List or search studies and find study IDs"],
    tool: "list_projects",
    options: { keyword: { ...string, valueName: "TEXT", description: ["\u6309\u5173\u952E\u8BCD\u7B5B\u9009", "Filter by keyword"] } },
    fields: { keyword: "keyword" },
    examples: ["heari studies list", 'heari studies list --keyword "..."'],
    notes: [["\u6700\u591A\u8FD4\u56DE 30 \u6761\u53CA total\uFF1B\u5F53\u524D\u4E0D\u63D0\u4F9B\u5206\u9875\u53C2\u6570\u3002", "Returns up to 30 entries and total; pagination flags are not available."]]
  });
  register("studies create", {
    policy: { effects: ["remote-write", "model-inference"], confirmation: "none", retry: "inspect-before-retry", authentication: "required" },
    description: ["\u76F4\u63A5\u521B\u5EFA\u7814\u7A76\u8349\u7A3F\uFF08\u5DF2\u6709\u5B8C\u6574\u7B80\u62A5\uFF09", "Create a draft directly from a complete brief"],
    tool: "create_study",
    options: {
      name: { ...string, valueName: "NAME", description: ["\u7814\u7A76\u540D\u79F0", "Study name"] },
      goal: { ...string, valueName: "TEXT", description: ["\u7814\u7A76\u8981\u652F\u6301\u7684\u51B3\u7B56\u95EE\u9898", "Decision question to inform"] },
      brief: { ...string, valueName: "TEXT", description: ["\u7814\u7A76\u80CC\u666F\u4E0E\u5DF2\u77E5\u4FE1\u606F", "Research context and known information"] },
      population: { ...string, valueName: "TEXT", description: ["\u76EE\u6807\u4EBA\u7FA4", "Target population"] },
      owner: { ...string, valueName: "NAME", description: ["\u51B3\u7B56\u8D1F\u8D23\u4EBA\uFF08\u53EF\u9009\uFF09", "Decision owner (optional)"] }
    },
    required: ["name", "goal", "brief", "population"],
    fields: { name: "name", goal: "decision_question", brief: "brief", population: "target_population", owner: "decision_owner" },
    examples: [['heari studies create --name "\u8BD5\u7528\u7814\u7A76" \\\n  --goal "\u6211\u4EEC\u5E94\u5982\u4F55\u63D0\u9AD8\u8BD5\u7528\u7528\u6237\u7684\u8D2D\u4E70\u610F\u613F\uFF1F" \\\n  --brief "\u7814\u7A76\u8BD5\u7528\u540E\u672A\u8D2D\u4E70\u7684\u539F\u56E0" --population "\u8FD1\u671F\u8BD5\u7528\u7528\u6237"', 'heari studies create --name "Trial study" \\\n  --goal "How should we improve trial conversion?" \\\n  --brief "Understand why trial users do not buy" --population "Recent trial users"']],
    notes: [["\u6B64\u547D\u4EE4\u76F4\u63A5\u521B\u5EFA\u8349\u7A3F\uFF0C\u4E0D\u4F1A\u518D\u6B21\u8BF7\u6C42\u786E\u8BA4\u3002\u9700\u8981\u5F15\u5BFC\u4E0E\u786E\u8BA4\u65F6\u4F7F\u7528 heari research\u3002", "Creates a draft immediately without another confirmation. Use heari research for guided preparation and confirmation."]]
  });
  register("studies status", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u67E5\u770B\u7814\u7A76\u3001\u914D\u989D\u548C\u8BBF\u8C08\u8FDB\u5EA6", "View study, quota and interview progress"],
    tool: "get_study_status",
    id: true,
    examples: ["heari studies status STUDY_UUID"],
    notes: [["\u9080\u8BF7\u94FE\u63A5\u72B6\u6001\u4E0D\u4EE3\u8868\u6E20\u9053\u9001\u8FBE\uFF1BNOT_TRACKED \u8868\u793A\u672A\u8DDF\u8E2A\u6295\u9012\u3002", "Invitation link state does not prove delivery; NOT_TRACKED means delivery is not tracked."]]
  });
  register("guide show", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u8BFB\u53D6\u5DF2\u6709\u7814\u7A76\u7684\u5B8C\u6574\u63D0\u7EB2", "Read the complete guide of an existing study"],
    tool: "get_study_guide",
    id: true,
    examples: ["heari guide show STUDY_UUID"]
  });
  register("guide edit", {
    policy: { effects: ["remote-write", "model-inference"], confirmation: "none", retry: "inspect-then-reuse-key", key_flags: ["turn-id"], authentication: "required" },
    description: ["\u7528\u81EA\u7136\u8BED\u8A00\u63D0\u51FA\u63D0\u7EB2\u4FEE\u6539\u5EFA\u8BAE\uFF0C\u5C1A\u4E0D\u4FDD\u5B58", "Propose natural-language guide edits without saving"],
    tool: "propose_study_guide_edit",
    id: true,
    options: {
      message: { ...string, valueName: "TEXT", description: ["\u63CF\u8FF0\u5E0C\u671B\u4FEE\u6539\u7684\u5185\u5BB9", "Describe the requested edits"] },
      chat: { ...string, valueName: "UUID", description: ["\u7EE7\u7EED\u540C\u4E00\u6BB5\u63D0\u7EB2\u5BF9\u8BDD\uFF0C\u4F7F\u7528\u4E0A\u6B21\u8FD4\u56DE\u7684 chat_id", "Continue the guide conversation using the returned chat_id"] },
      "turn-id": { ...string, valueName: "UUID", description: ["\u672C\u8F6E\u8BF7\u6C42\u6807\u8BC6\uFF1B\u672A\u6307\u5B9A\u65F6\u81EA\u52A8\u751F\u6210\uFF0C\u6838\u5BF9\u7ED3\u679C\u540E\u91CD\u8BD5\u53EF\u590D\u7528", "Turn identity; generated when omitted, reuse for a checked retry"] }
    },
    required: ["message"],
    fields: { message: "message", chat: "chat_id", "turn-id": "turn_id" },
    examples: [['heari guide edit STUDY_UUID --message "\u8865\u5145\u4EF7\u683C\u76F8\u5173\u95EE\u9898"', 'heari guide edit STUDY_UUID --message "Add questions about price"']],
    notes: [["\u5148\u6838\u5BF9 edit_proposal \u7684 before/after \u548C items\uFF1B\u6CA1\u6709\u5019\u9009\u65F6\u6309 reply \u8865\u5145\u4FE1\u606F\u3002\u4E0D\u4F1A\u53D1\u5E03\u6216\u8054\u7CFB\u4EFB\u4F55\u4EBA\u3002", "Review edit_proposal before/after and items first; if no proposal is returned, follow reply to clarify. Nothing is published and nobody is contacted."]]
  });
  register("guide apply", {
    policy: { effects: ["remote-read", "conditional-remote-write"], confirmation: "confirm-flag", retry: "inspect-then-reuse-key", key_flags: ["chat", "proposal"], authentication: "required" },
    description: ["\u9884\u89C8\u6216\u663E\u5F0F\u786E\u8BA4\u5DF2\u5BA1\u9605\u7684\u63D0\u7EB2\u4FEE\u6539\u5019\u9009", "Preview or explicitly apply a reviewed guide proposal"],
    tool: "apply_study_guide_edit",
    id: true,
    options: {
      chat: { ...string, valueName: "UUID", description: ["\u5EFA\u8BAE\u8FD4\u56DE\u7684 chat_id", "chat_id returned by the proposal"] },
      proposal: { ...string, valueName: "UUID", description: ["\u5DF2\u5BA1\u9605\u7684 edit_proposal.id", "Reviewed edit_proposal.id"] },
      confirm: { type: "boolean", description: ["\u786E\u8BA4\u4FDD\u5B58\u8BE5\u5019\u9009\uFF1B\u63D0\u7EB2\u5DF2\u53D8\u5316\u65F6\u62D2\u7EDD\u8986\u76D6", "Confirm saving this proposal; stale guides cannot be overwritten"] }
    },
    required: ["chat", "proposal"],
    fields: { chat: "chat_id", proposal: "proposal_id", confirm: "confirmed" },
    examples: ["heari guide apply STUDY_UUID --chat CHAT_UUID --proposal PROPOSAL_UUID --confirm"],
    notes: [["\u68C0\u67E5 applied\uFF1B\u8FC7\u671F\u6216\u5DF2\u5904\u7406\u5019\u9009\u4E0D\u4F1A\u518D\u6B21\u5E94\u7528\u3002\u5DF2\u53D1\u5E03\u7248\u672C\u4E0D\u80FD\u539F\u5730\u4FEE\u6539\u3002", "Check applied; stale or processed proposals are not applied again. Published versions cannot be edited in place."]]
  });
  register("interviews list", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u5217\u51FA\u7814\u7A76\u8BBF\u8C08\u3001\u8D28\u91CF\u6807\u8BB0\u53CA\u4E0B\u4E00\u9875", "List study interviews, quality flags and the next page"],
    tool: "list_interviews",
    id: true,
    options: {
      limit: { ...string, valueName: "N", description: ["\u6BCF\u9875\u8BBF\u8C08\u6570\uFF0C1\u201350\uFF0C\u9ED8\u8BA420", "Interviews per page, 1\u201350; default 20"] },
      offset: { ...string, valueName: "N", description: ["\u670D\u52A1\u7AEF\u8FD4\u56DE\u7684\u4E0B\u4E00\u9875\u504F\u79FB\u91CF\uFF0C\u9ED8\u8BA40", "Next offset returned by the server; default 0"] }
    },
    constraints: [
      { when_present: "limit", integer_string: "limit", minimum: 1, maximum: 50, flag: "limit", target_field: "limit", normalize: "integer", message: ["--limit \u5FC5\u987B\u662F1\u523050\u7684\u6574\u6570\u3002", "--limit must be an integer from 1 to 50."] },
      { when_present: "offset", integer_string: "offset", minimum: 0, flag: "offset", target_field: "offset", normalize: "integer", message: ["--offset \u5FC5\u987B\u662F\u975E\u8D1F\u6574\u6570\u3002", "--offset must be a nonnegative integer."] }
    ],
    examples: ["heari interviews list STUDY_UUID", "heari interviews list STUDY_UUID --limit 20 --offset 20"],
    notes: [["\u6B64\u5904\u53EA\u8BFB\u5143\u6570\u636E\uFF0C\u4E0D\u5305\u542B\u9010\u5B57\u7A3F\uFF1Bnext_offset \u4E3A\u7A7A\u8868\u793A\u5DF2\u5230\u672B\u9875\u3002\u8D28\u91CF\u6807\u8BB0\u4E0D\u4EE3\u8868\u8BC1\u636E\u5DF2\u7ECF\u5BA1\u6838\u3002", "Metadata only; next_offset=null ends pagination. Quality flags do not establish reviewed evidence."]]
  });
  register("interviews show", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u8BFB\u53D6\u8BBF\u8C08\u5143\u6570\u636E\u548C\u5DF2\u6709\u8D28\u91CF\u8BA1\u6570", "Read interview metadata and existing quality counters"],
    tool: "get_interview",
    id: true,
    idField: "interview_id",
    idName: "interview-id",
    examples: ["heari interviews show INTERVIEW_UUID"]
  });
  register("interviews transcript", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "same-source-after-recovery", authentication: "required" },
    description: ["\u5206\u9875\u8BFB\u53D6\u5B8C\u6574\u9010\u5B57\u7A3F\uFF0C\u4E0D\u622A\u77ED\u539F\u6587", "Read full transcript turns in explicit pages without clipping"],
    tool: "get_interview_transcript",
    id: true,
    idField: "interview_id",
    idName: "interview-id",
    options: {
      limit: { ...string, valueName: "N", description: ["\u6BCF\u9875\u8F6E\u6B21\u6570\uFF0C1\u201350\uFF0C\u9ED8\u8BA420", "Turns per page, 1\u201350; default 20"] },
      offset: { ...string, valueName: "N", description: ["\u4E0B\u4E00\u9875\u504F\u79FB\u91CF\uFF1B\u540E\u7EED\u9875\u9700\u540C\u65F6\u6307\u5B9A --source-version", "Next offset; continuation requires --source-version"] },
      "source-version": { ...string, valueName: "N", description: ["\u4E0A\u4E00\u9875\u8FD4\u56DE\u7684 interview_version\uFF1B\u53D8\u5316\u65F6\u4E0D\u8FD4\u56DE\u6B63\u6587", "interview_version from the previous page; changed sources return no text"] }
    },
    constraints: [
      { when_present: "limit", integer_string: "limit", minimum: 1, maximum: 50, flag: "limit", target_field: "limit", normalize: "integer", message: ["--limit \u5FC5\u987B\u662F1\u523050\u7684\u6574\u6570\u3002", "--limit must be an integer from 1 to 50."] },
      { when_present: "offset", integer_string: "offset", minimum: 0, flag: "offset", target_field: "offset", normalize: "integer", message: ["--offset \u5FC5\u987B\u662F\u975E\u8D1F\u6574\u6570\u3002", "--offset must be a nonnegative integer."] },
      { when_present: "source-version", integer_string: "source-version", minimum: 1, flag: "source-version", target_field: "expected_version", normalize: "integer", message: ["--source-version \u5FC5\u987B\u662F\u6B63\u6574\u6570\u3002", "--source-version must be a positive integer."] }
    ],
    examples: ["heari interviews transcript INTERVIEW_UUID", "heari interviews transcript INTERVIEW_UUID --offset 20 --source-version 7"],
    notes: [["\u68C0\u67E5 available\u3001reason\u3001interview_version \u548C next_offset\u3002\u64A4\u56DE\u3001\u672A\u540C\u610F\u6216\u7248\u672C\u53D8\u5316\u4E0D\u8FD4\u56DE\u6B63\u6587\uFF1B\u4E0D\u8981\u628A\u672A\u8BFB\u5230\u7684\u9875\u9762\u5F53\u6210\u5DF2\u8BFB\u3002", "Check available, reason, interview_version and next_offset. Withdrawn, unconsented or changed sources return no text; unread pages have not been reviewed."]]
  });
  register("findings", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u67E5\u770B\u6D1E\u5BDF\u3001\u5BA1\u6838\u72B6\u6001\u4E0E\u539F\u8BDD\u8BC1\u636E", "View findings, review status and quote evidence"],
    tool: "get_findings",
    id: true,
    examples: ["heari findings STUDY_UUID"]
  });
  register("findings review", {
    policy: { effects: ["remote-read", "conditional-remote-write"], confirmation: "confirm-flag", retry: "inspect-before-retry", authentication: "required" },
    description: ["\u9884\u89C8\u6216\u786E\u8BA4\u5BA1\u6838\u6307\u5B9A\u6D1E\u5BDF\uFF0C\u7ED1\u5B9A\u5DF2\u5BA1\u9605\u6307\u7EB9", "Preview or confirm an insight review bound to its fingerprint"],
    tool: "review_insight",
    id: true,
    idField: "insight_id",
    idName: "insight-id",
    options: {
      study: { ...string, valueName: "UUID", description: ["\u6D1E\u5BDF\u6240\u5728\u7814\u7A76 UUID", "Study UUID containing the insight"] },
      decision: { ...string, valueName: "DECISION", description: ["accepted\u3001modified\u3001rejected \u6216 needs_follow_up", "accepted, modified, rejected or needs_follow_up"] },
      conclusion: { ...string, valueName: "TEXT", description: ["modified \u65F6\u7684\u65B0\u7ED3\u8BBA\uFF1B\u4E0D\u4FEE\u6539\u539F\u59CB\u8BC1\u636E", "New conclusion for modified; original evidence is unchanged"] },
      note: { ...string, valueName: "TEXT", description: ["\u7814\u7A76\u5458\u5BA1\u6838\u5907\u6CE8", "Researcher review note"] },
      fingerprint: { ...string, valueName: "SHA256", description: ["\u9884\u89C8\u8FD4\u56DE\u7684\u6307\u7EB9\uFF1B\u786E\u8BA4\u65F6\u5FC5\u586B", "Fingerprint returned by preview; required for confirmation"] },
      confirm: { type: "boolean", description: ["\u786E\u8BA4\u5BA1\u6838\uFF1B\u6D1E\u5BDF\u53D8\u5316\u65F6\u62D2\u7EDD\u8986\u76D6", "Confirm review; changed insights cannot be overwritten"] }
    },
    required: ["study", "decision"],
    fields: { study: "project_id", conclusion: "conclusion", note: "researcher_note", fingerprint: "expected_fingerprint", confirm: "confirmed" },
    constraints: [
      { flag: "decision", enum: ["accepted", "modified", "rejected", "needs_follow_up"], case_insensitive: true, target_field: "decision", normalize: "upper" },
      { when: { confirm: true }, required: ["fingerprint"], min_trimmed_length: { fingerprint: 64 }, message: ["\u786E\u8BA4\u65F6\u8BF7\u63D0\u4F9B\u9884\u89C8\u4E2D\u7684 --fingerprint\u3002", "Provide the preview --fingerprint when confirming."] }
    ],
    examples: ["heari findings review INSIGHT_UUID --study STUDY_UUID --decision accepted", "heari findings review INSIGHT_UUID --study STUDY_UUID --decision accepted --fingerprint SHA256 --confirm"],
    notes: [["\u5148\u5BA1\u9605\u7ED3\u8BBA\u3001\u8BC1\u636E\u53CA\u4FEE\u6539\u5185\u5BB9\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u751F\u6210\u6216\u53D1\u5E03\u62A5\u544A\u3002", "Review the conclusion, evidence and proposed changes first; no report is generated or published automatically."]]
  });
  register("reports", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u67E5\u770B\u6700\u65B0\u7814\u7A76\u62A5\u544A", "View the latest study report"],
    tool: "get_latest_report",
    id: true,
    examples: ["heari reports STUDY_UUID"]
  });
  register("studies publish", {
    policy: { effects: ["remote-read", "conditional-remote-write"], confirmation: "confirm-flag", retry: "inspect-before-retry", authentication: "required" },
    description: ["\u9884\u89C8\u6216\u786E\u8BA4\u53D1\u5E03\u5DF2\u4FDD\u5B58\u7684\u8BBF\u8C08\u63D0\u7EB2", "Preview or confirm publication of the saved interview guide"],
    tool: "publish_study",
    id: true,
    options: { confirm: { type: "boolean", description: ["\u786E\u8BA4\u5DF2\u5BA1\u6838\u63D0\u7EB2\u5E76\u6267\u884C\u53D1\u5E03\u68C0\u67E5\uFF1B\u4E0D\u53D1\u9001\u9080\u8BF7", "Confirm the reviewed guide and run publication checks; no invitations are sent"] } },
    fields: { confirm: "confirmed" },
    examples: ["heari studies publish STUDY_UUID", "heari studies publish STUDY_UUID --confirm"]
  });
  register("analysis start", {
    policy: { effects: ["remote-read", "conditional-remote-job"], confirmation: "confirm-flag", retry: "inspect-before-retry", authentication: "required" },
    description: ["\u9884\u89C8\u6216\u786E\u8BA4\u542F\u52A8\u5F02\u6B65\u5206\u6790\u4EFB\u52A1", "Preview or confirm an asynchronous analysis job"],
    tool: "start_analysis",
    id: true,
    options: { confirm: { type: "boolean", description: ["\u786E\u8BA4\u521B\u5EFA\u5206\u6790\u4EFB\u52A1\uFF1B\u8FD4\u56DE\u4EFB\u52A1\u7F16\u53F7\u540E\u67E5\u8BE2\u8FDB\u5EA6", "Confirm job creation; poll the returned job ID for progress"] } },
    fields: { confirm: "confirmed" },
    examples: ["heari analysis start STUDY_UUID --confirm"]
  });
  register("analysis status", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "same-job-after-recovery", authentication: "required" },
    constraints: [
      { when_present: "timeout-ms", requires_values: { wait: true }, integer_string: "timeout-ms", minimum: 1e3, maximum: 36e5, message: ["--timeout-ms \u9700\u8981 --wait\uFF0C\u4E14\u5FC5\u987B\u4E3A1000\u52303600000\u4E4B\u95F4\u7684\u6574\u6570\u3002", "--timeout-ms requires --wait and an integer between 1000 and 3600000."] },
      { when: { wait: true }, default_timeout_ms: 3e5, does_not_restart_job: true }
    ],
    description: ["\u67E5\u8BE2\u5206\u6790\u4EFB\u52A1\u8FDB\u5EA6\u548C\u7EC8\u6001\u9519\u8BEF", "Read analysis job progress and terminal errors"],
    tool: "get_analysis_status",
    id: true,
    idField: "job_id",
    idName: "job-id",
    options: { wait: { type: "boolean", description: ["\u7B49\u5F85\u4EFB\u52A1\u7EC8\u6001\uFF1B\u4E0D\u4F1A\u91CD\u65B0\u542F\u52A8\u4EFB\u52A1", "Wait for a terminal state without restarting the job"] }, "timeout-ms": { ...string, valueName: "MS", description: ["\u7B49\u5F85\u603B\u9884\u7B97\uFF0C\u9ED8\u8BA4300000\u6BEB\u79D2\uFF0C\u8303\u56F41000\u20133600000", "Total wait budget, default 300000ms; range 1000\u20133600000"] } },
    examples: ["heari analysis status JOB_UUID"]
  });
  register("reports show", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u8BFB\u53D6\u5B8C\u6574\u62A5\u544A\u53CA\u5F53\u524D\u5185\u5BB9\u6307\u7EB9", "Read a full report and its current content fingerprint"],
    tool: "get_report",
    id: true,
    idField: "report_id",
    idName: "report-id",
    examples: ["heari reports show REPORT_UUID"],
    notes: [["\u6765\u6E90\u5931\u6548\u65F6 available=false\uFF0C\u4E0D\u8FD4\u56DE\u62A5\u544A\u6B63\u6587\u3002", "Invalidated sources return available=false without report content."]]
  });
  register("reports edit", {
    policy: { effects: ["remote-read", "conditional-remote-write"], confirmation: "confirm-flag", retry: "inspect-before-retry", authentication: "required" },
    description: ["\u9884\u89C8\u6216\u786E\u8BA4\u4FEE\u6539\u8349\u7A3F\u63AA\u8F9E\uFF0C\u4FDD\u7559\u5F15\u7528\u4E0E\u8BC1\u636E", "Preview or confirm draft wording edits while preserving citations and evidence"],
    tool: "edit_report",
    id: true,
    idField: "report_id",
    idName: "report-id",
    options: {
      title: { ...string, valueName: "TEXT", description: ["\u65B0\u7684\u62A5\u544A\u6807\u9898", "New report title"] },
      summary: { ...string, valueName: "TEXT", description: ["\u65B0\u7684\u6458\u8981", "New executive summary"] },
      "section-body": { ...string, multiple: true, valueName: "TEXT", description: ["\u6309\u539F\u987A\u5E8F\u63D0\u4F9B\u5168\u90E8\u6BB5\u843D\u6B63\u6587\uFF0C\u53EF\u91CD\u590D\uFF1B\u4E0D\u4FEE\u6539\u6807\u9898\u3001\u987A\u5E8F\u6216\u5F15\u7528", "Repeat for all section bodies in original order; headings, order and citations stay unchanged"] },
      fingerprint: { ...string, valueName: "SHA256", description: ["\u5DF2\u5BA1\u9605\u539F\u7A3F\u7684\u6307\u7EB9\uFF1B\u786E\u8BA4\u65F6\u5FC5\u586B", "Fingerprint of the reviewed draft; required for confirmation"] },
      confirm: { type: "boolean", description: ["\u786E\u8BA4\u4FDD\u5B58\u63AA\u8F9E\uFF1B\u62D2\u7EDD\u9648\u65E7\u3001\u5DF2\u53D1\u5E03\u6216\u6765\u6E90\u5931\u6548\u7684\u7A3F\u4EF6", "Confirm wording changes; stale, published or invalidated reports are rejected"] }
    },
    fields: { title: "title", summary: "executive_summary", "section-body": "section_bodies", fingerprint: "expected_fingerprint", confirm: "confirmed" },
    constraints: [
      { requires_any: ["title", "summary", "section-body"], message: ["\u81F3\u5C11\u63D0\u4F9B\u6807\u9898\u3001\u6458\u8981\u6216\u6BB5\u843D\u6B63\u6587\u4E4B\u4E00\u3002", "Provide a title, summary or section bodies."] },
      { when: { confirm: true }, required: ["fingerprint"], min_trimmed_length: { fingerprint: 64 }, message: ["\u786E\u8BA4\u65F6\u8BF7\u63D0\u4F9B\u9884\u89C8\u4E2D\u7684 --fingerprint\u3002", "Provide the preview --fingerprint when confirming."] }
    ],
    examples: [['heari reports edit REPORT_UUID --title "\u65B0\u7684\u62A5\u544A\u6807\u9898"', 'heari reports edit REPORT_UUID --title "Reviewed report title"'], ['heari reports edit REPORT_UUID --title "\u65B0\u7684\u62A5\u544A\u6807\u9898" --fingerprint SHA256 --confirm', 'heari reports edit REPORT_UUID --title "Reviewed report title" --fingerprint SHA256 --confirm']],
    notes: [["\u4EC5\u4FDD\u5B58\u8349\u7A3F\u6587\u672C\uFF0C\u4E0D\u6539\u53D8\u8BC1\u636E\u3001\u5F15\u7528\u3001\u7ED3\u6784\u3001\u6765\u6E90\u6216\u53D1\u5E03\u72B6\u6001\u3002", "Only draft wording is saved; evidence, citations, structure, sources and publication status are preserved."]]
  });
  register("reports generate", {
    policy: { effects: ["remote-read", "conditional-remote-write"], confirmation: "confirm-flag", retry: "inspect-before-retry", authentication: "required" },
    description: ["\u9884\u89C8\u6216\u786E\u8BA4\u751F\u6210\u7814\u7A76\u62A5\u544A\u8349\u7A3F", "Preview or confirm generation of a report draft"],
    tool: "generate_report",
    id: true,
    options: { confirm: { type: "boolean", description: ["\u786E\u8BA4\u751F\u6210\u8349\u7A3F\uFF1B\u4E0D\u4F1A\u53D1\u5E03\u62A5\u544A\u6216\u5BA1\u6838\u6D1E\u5BDF", "Confirm draft generation; does not publish reports or approve insights"] } },
    fields: { confirm: "confirmed" },
    examples: ["heari reports generate STUDY_UUID --confirm"]
  });
  register("reports publish", {
    policy: { effects: ["remote-read", "conditional-remote-write"], confirmation: "confirm-flag", retry: "inspect-before-retry", authentication: "required" },
    description: ["\u9884\u89C8\u6216\u786E\u8BA4\u53D1\u5E03\u5DF2\u5BA1\u6838\u7684\u62A5\u544A", "Preview or confirm publication of a reviewed report"],
    tool: "publish_report",
    id: true,
    idField: "report_id",
    idName: "report-id",
    options: { confirm: { type: "boolean", description: ["\u786E\u8BA4\u5DF2\u5BA1\u6838\u62A5\u544A\u5E76\u6267\u884C\u53D1\u5E03\u68C0\u67E5", "Confirm the reviewed report and run publication checks"] } },
    fields: { confirm: "confirmed" },
    examples: ["heari reports publish REPORT_UUID", "heari reports publish REPORT_UUID --confirm"]
  });
  register("reports export", {
    policy: { effects: ["remote-read", "conditional-remote-job"], confirmation: "confirm-flag", retry: "inspect-then-reuse-key", key_flags: ["idempotency-key"], authentication: "required" },
    constraints: [
      { flag: "type", enum: ["pdf", "csv", "pptx"], case_insensitive: true, default: "pdf", target_field: "export_format", normalize: "upper", message: ["--type \u5FC5\u987B\u4E3A pdf\u3001csv \u6216 pptx\u3002", "--type must be pdf, csv or pptx."] },
      { when: { confirm: true }, min_trimmed_length: { "idempotency-key": 8 }, required: ["idempotency-key"], message: ["\u8BF7\u63D0\u4F9B\u81F3\u5C118\u5B57\u7B26\u7684\u7A33\u5B9A --idempotency-key\u3002", "A stable --idempotency-key of at least 8 characters is required."] }
    ],
    description: ["\u9884\u89C8\u6216\u786E\u8BA4\u521B\u5EFA\u8131\u654F\u62A5\u544A\u5BFC\u51FA\u4EFB\u52A1", "Preview or confirm a redacted report export job"],
    tool: "export_report",
    id: true,
    idField: "report_id",
    idName: "report-id",
    options: {
      type: { ...string, valueName: "pdf|csv|pptx", description: ["\u5BFC\u51FA\u7C7B\u578B\uFF0C\u9ED8\u8BA4 pdf", "Export type; default: pdf"] },
      "idempotency-key": { ...string, valueName: "KEY", description: ["\u786E\u8BA4\u5BFC\u51FA\u65F6\u5FC5\u586B\uFF1B\u91CD\u8BD5\u987B\u590D\u7528\u76F8\u540C\u952E\u53CA\u53C2\u6570", "Required for confirmed exports; reuse the same key and options for retries"] },
      confirm: { type: "boolean", description: ["\u786E\u8BA4\u8131\u654F\u9884\u89C8\u5E76\u521B\u5EFA\u5BA1\u8BA1\u5BFC\u51FA\u4EFB\u52A1", "Confirm the redaction preview and create an audited export job"] }
    },
    fields: { confirm: "confirmed", "idempotency-key": "idempotency_key" },
    examples: ["heari reports export REPORT_UUID --type pdf", "heari reports export REPORT_UUID --type pdf --idempotency-key export-review-001 --confirm"]
  });
  register("reports export-status", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "same-job-after-recovery", authentication: "required" },
    constraints: [
      { when_present: "timeout-ms", requires_values: { wait: true }, integer_string: "timeout-ms", minimum: 1e3, maximum: 36e5, message: ["--timeout-ms \u9700\u8981 --wait\uFF0C\u4E14\u5FC5\u987B\u4E3A1000\u52303600000\u4E4B\u95F4\u7684\u6574\u6570\u3002", "--timeout-ms requires --wait and an integer between 1000 and 3600000."] },
      { when: { wait: true }, default_timeout_ms: 3e5, does_not_restart_job: true }
    ],
    description: ["\u67E5\u8BE2\u62A5\u544A\u5BFC\u51FA\u4EFB\u52A1\u72B6\u6001", "Read report export job status"],
    tool: "get_report_export_status",
    id: true,
    idField: "job_id",
    idName: "job-id",
    options: { wait: { type: "boolean", description: ["\u7B49\u5F85\u5BFC\u51FA\u5C31\u7EEA\u6216\u7EC8\u6001\uFF1B\u4E0D\u521B\u5EFA\u5BFC\u51FA", "Wait for ready or terminal state without creating an export"] }, "timeout-ms": { ...string, valueName: "MS", description: ["\u7B49\u5F85\u603B\u9884\u7B97\uFF0C\u9ED8\u8BA4300000\u6BEB\u79D2\uFF0C\u8303\u56F41000\u20133600000", "Total wait budget, default 300000ms; range 1000\u20133600000"] } },
    examples: ["heari reports export-status JOB_UUID"]
  });
  register("reports download", {
    policy: { effects: ["remote-download-grant", "local-file-create"], confirmation: "none", retry: "inspect-file-and-grant-before-retry", authentication: "required" },
    description: ["\u4E0B\u8F7D\u5DF2\u5C31\u7EEA\u62A5\u544A\u6587\u4EF6\uFF0C\u62D2\u7EDD\u8986\u76D6\u5DF2\u6709\u6587\u4EF6", "Download a ready report artifact without overwriting existing files"],
    tool: "get_report_download",
    id: true,
    idField: "job_id",
    idName: "job-id",
    options: { output: { ...string, valueName: "FILE", description: ["\u4FDD\u5B58\u5230\u6B64\u6587\u4EF6\uFF1B\u7236\u76EE\u5F55\u987B\u5DF2\u5B58\u5728", "Save to this file; its parent directory must exist"] } },
    required: ["output"],
    examples: ["heari reports download JOB_UUID --output report.pdf"]
  });
  register("quotes search", {
    policy: { effects: ["remote-read"], confirmation: "none", retry: "read-after-recovery", authentication: "required" },
    description: ["\u6309\u4E3B\u9898\u68C0\u7D22\u53D7\u8BBF\u8005\u539F\u8BDD\u53CA\u8BC1\u636E\u7F16\u53F7", "Search participant quotes by topic with evidence IDs"],
    tool: "search_quotes",
    options: {
      query: { ...string, valueName: "TEXT", description: ["\u68C0\u7D22\u5173\u952E\u8BCD\u6216\u95EE\u9898", "Search keywords or question"] },
      study: { ...string, multiple: true, valueName: "UUID", description: ["\u9650\u5B9A\u7814\u7A76\uFF1B\u53EF\u91CD\u590D\u4F7F\u7528", "Limit to a study; repeatable"] }
    },
    required: ["query"],
    fields: { query: "query", study: "project_ids" },
    examples: ['heari quotes search --query "..."', 'heari quotes search --query "..." --study STUDY_UUID']
  });
  register("knowledge ask", {
    policy: { effects: ["remote-read", "model-inference"], confirmation: "none", retry: "inspect-before-retry", authentication: "required" },
    description: ["\u57FA\u4E8E\u8D44\u6599\u5E93\u56DE\u7B54\u95EE\u9898\uFF0C\u9644\u8BC1\u636E\u5F15\u7528", "Ask the library a question with evidence citations"],
    tool: "ask_knowledge_base",
    options: {
      question: { ...string, valueName: "TEXT", description: ["\u9700\u8981\u8D44\u6599\u5E93\u56DE\u7B54\u7684\u95EE\u9898", "Question for the research library"] },
      study: { ...string, multiple: true, valueName: "UUID", description: ["\u9650\u5B9A\u7814\u7A76\uFF1B\u53EF\u91CD\u590D\u4F7F\u7528", "Limit to a study; repeatable"] }
    },
    required: ["question"],
    fields: { question: "question", study: "project_ids" },
    examples: ['heari knowledge ask --question "..."', 'heari knowledge ask --question "..." --study STUDY_UUID'],
    notes: [["\u68C0\u67E5 sufficient\u3001caveats \u548C\u5F15\u7528\uFF1B\u8BC1\u636E\u4E0D\u8DB3\u4E0D\u7B49\u4E8E\u5DF2\u9A8C\u8BC1\u7ED3\u8BBA\u3002", "Check sufficient, caveats and citations; insufficient evidence is not a verified conclusion."]]
  });
}
var globalOptions = {
  select: { ...string, multiple: true, valueName: "/PATH", description: ["\u4EC5\u9009\u62E9\u6307\u5B9A\u7ED3\u679C\u8DEF\u5F84\uFF0C\u53EF\u91CD\u590D\uFF1B* \u904D\u5386\u6570\u7EC4\uFF0C\u8F93\u51FA\u5E26\u90E8\u5206\u7ED3\u679C\u6807\u8BB0", "Select result paths; repeatable, * traverses arrays, output includes partial-result metadata"] },
  "max-items": { ...string, valueName: "N", description: ["\u6BCF\u4E2A\u8F93\u51FA\u6570\u7EC4\u6700\u591A\u4FDD\u7559 N \u9879\uFF081\u20131000\uFF09\uFF0C\u9644\u5B8C\u6574\u6570\u91CF\u4E0E\u622A\u65AD\u6807\u8BB0", "Limit each output array to N items (1\u20131000), with original counts and truncation metadata"] },
  compact: { type: "boolean", description: ["\u8F93\u51FA\u5355\u884C JSON\uFF1B\u9ED8\u8BA4 JSON \u5DF2\u7D27\u51D1\uFF0C\u4E0D\u80FD\u4E0E table \u540C\u7528", "Use single-line JSON; default JSON is already compact, incompatible with table"] },
  help: { type: "boolean", short: "h", description: ["\u663E\u793A\u5F53\u524D\u547D\u4EE4\u5E2E\u52A9", "Show help for this command"] },
  lang: { ...string, valueName: "zh-CN|en-US", description: ["CLI \u6587\u6848\u8BED\u8A00\uFF08\u9ED8\u8BA4 zh-CN\uFF09", "CLI text language (default: zh-CN)"] },
  format: { ...string, valueName: "json|text|table", description: ["\u9ED8\u8BA4 json\uFF1Btext \u4E3A\u7F29\u8FDB JSON\uFF1Btable \u4E3A\u53EF\u8BFB\u8868\u683C\u4E0E\u5C42\u7EA7\u5C55\u793A", "Default: json; text is indented JSON; table shows readable tables and outlines"] },
  "no-input": { type: "boolean", description: ["\u7981\u7528\u4EA4\u4E92\u63D0\u95EE\uFF0C\u9519\u8BEF\u59CB\u7EC8\u8F93\u51FA JSON", "Disable prompts and always emit JSON errors"] }
};
var rootOptions = {
  "help-all": { type: "boolean", description: ["\u5217\u51FA\u5168\u90E8\u547D\u4EE4\u7528\u6CD5", "List usage for every command"] },
  version: { type: "boolean", description: ["\u663E\u793A\u7248\u672C", "Show version"] }
};

// src/command/help.mjs
function configureHelp(node, locale, metadata2, nameOf) {
  const t = (zh, en) => pick(locale, zh, en);
  const local2 = (value) => Array.isArray(value) ? t(...value) : value;
  const titles = /* @__PURE__ */ new Map([["Usage:", t("\u7528\u6CD5", "USAGE")], ["Options:", t("\u9009\u9879", "FLAGS")], ["Global Options:", t("\u5168\u5C40\u9009\u9879", "GLOBAL FLAGS")], ["Arguments:", t("\u53C2\u6570", "ARGUMENTS")], ["Commands:", t("\u547D\u4EE4", "COMMANDS")]]);
  node.configureHelp({
    showGlobalOptions: true,
    helpWidth: 100,
    visibleGlobalOptions(command) {
      return Help.prototype.visibleGlobalOptions.call(this, command).filter((option) => !["version", "help-all"].includes(option.name()));
    },
    visibleCommands(command) {
      const visible = Help.prototype.visibleCommands.call(this, command);
      const descendants = (parent) => parent.commands.flatMap((child) => [child, ...descendants(child)]);
      return command.parent ? visible : visible.flatMap((child) => [child, ...descendants(child)]);
    },
    styleTitle: (title) => titles.get(title) ?? title,
    subcommandTerm: (command) => `heari ${nameOf(command)}${command.registeredArguments.map((argument) => ` ${argument.required ? "<" : "["}${argument.name()}${argument.variadic ? "..." : ""}${argument.required ? ">" : "]"}`).join("")}`,
    optionDescription: (option) => `${option.description}${option.mandatory ? t("\uFF08\u5FC5\u586B\uFF09", " (required)") : ""}`,
    argumentDescription: (argument) => argument.description
  });
  node.addHelpText("after", () => {
    const spec = metadata2(node);
    const lines = [];
    const section = (title, values) => {
      if (values.length) lines.push("", title, ...values.map((value) => `  ${value.replaceAll("\n", "\n  ")}`));
    };
    if (!node.parent) section(t("\u5373\u5C06\u652F\u6301", "COMING SOON"), [t("launch_interviews \u2014 \u7814\u7A76\u5458\u786E\u8BA4\u540E\u53D1\u9001\u8BBF\u8C08\u9080\u8BF7\uFF1B\u5F53\u524D\u6682\u4E0D\u53EF\u8C03\u7528\u3002", "launch_interviews \u2014 Send interview invitations after researcher confirmation; not currently callable.")]);
    section(t("\u8BF4\u660E", "NOTES"), spec?.notes?.map(local2) ?? []);
    section(t("\u793A\u4F8B", "EXAMPLES"), spec?.examples.map(local2) ?? node.commands.filter((child) => metadata2(child)).map((child) => `heari ${nameOf(child)} --help`));
    if (nameOf(node) === "login" || !node.parent) {
      section(t("\u73AF\u5883\u4E0E\u914D\u7F6E", "ENVIRONMENT & CONFIGURATION"), ["HEARI_ENDPOINT / HEARI_TOKEN", t("\u666E\u901A\u547D\u4EE4\u987B\u540C\u65F6\u8BBE\u7F6E\u4E24\u9879\u4EE5\u8986\u76D6\u5DF2\u4FDD\u5B58\u51ED\u636E\u3002", "Set both to override saved credentials for ordinary commands."), "XDG_CONFIG_HOME", t("\u51ED\u636E\uFF1A$XDG_CONFIG_HOME/heari/credentials.json\uFF1B\u9ED8\u8BA4 ~/.config/heari/credentials.json\uFF08\u6587\u4EF6\u6743\u9650600\uFF09\u3002", "Credentials: $XDG_CONFIG_HOME/heari/credentials.json; default ~/.config/heari/credentials.json (file mode 600).")]);
      section(t("\u9000\u51FA\u7801", "EXIT CODES"), [t("0 \u6210\u529F\uFF1B1 \u670D\u52A1\u3001\u8BA4\u8BC1\u6216\u672C\u5730\u9519\u8BEF\uFF1B2 \u547D\u4EE4\u7528\u6CD5\u9519\u8BEF\u3002", "0 success; 1 service, authentication or local error; 2 usage error.")]);
    }
    return lines.join("\n");
  });
}

// src/command/validation.mjs
function applyConstraints(rules, values, problem) {
  for (const rule of rules) {
    if (rule.when && !Object.entries(rule.when).every(([flag, value]) => values[flag] === value)) continue;
    if (rule.when_present && values[rule.when_present] === void 0) continue;
    const invalid = () => problem(rule.message?.[1] ?? "Invalid option combination.", rule.message?.[0] ?? "\u9009\u9879\u7EC4\u5408\u65E0\u6548\u3002");
    if (rule.mutually_exclusive?.some((group) => group.filter((flag) => values[flag]).length > 1)) invalid();
    if (rule.required?.some((flag) => typeof values[flag] !== "string" || !values[flag].trim())) invalid();
    if (rule.requires_any && !rule.requires_any.some((flag) => values[flag])) invalid();
    if (rule.requires_values && !Object.entries(rule.requires_values).every(([flag, value]) => values[flag] === value)) invalid();
    if (rule.min_trimmed_length && Object.entries(rule.min_trimmed_length).some(([flag, length]) => typeof values[flag] !== "string" || values[flag].trim().length < length)) invalid();
    if (rule.integer_string) {
      const value = String(values[rule.integer_string]);
      if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < (rule.minimum ?? 0) || Number(value) > (rule.maximum ?? Infinity)) invalid();
    }
  }
}

// src/io/projection.mjs
function outputOptions(values, problem = (en, zh) => fail("USAGE", en, zh)) {
  if (values.compact && values.format === "table") problem("--compact cannot be used with table output.", "--compact \u4E0D\u80FD\u4E0E table \u8F93\u51FA\u540C\u7528\u3002");
  const paths = [...new Set(Array.isArray(values.select) ? values.select : [])];
  if (paths.length > 32 || paths.some((path) => !path.startsWith("/") || path.length > 512 || path.split("/").length > 17 || /~(?![01])/u.test(path))) problem("--select requires up to 32 slash paths, at most 16 segments each; escape ~ and / as ~0 and ~1.", "--select \u6700\u591A32\u4E2A\u4EE5 / \u5F00\u5934\u7684\u8DEF\u5F84\uFF0C\u6BCF\u4E2A\u6700\u591A16\u6BB5\uFF1B~ \u4E0E / \u5206\u522B\u7528 ~0 \u548C ~1 \u8F6C\u4E49\u3002");
  let limit;
  if (values["max-items"] !== void 0) {
    const value = String(values["max-items"]);
    if (!/^[0-9]+$/.test(value) || Number(value) < 1 || Number(value) > 1e3) problem("--max-items must be an integer from 1 to 1000.", "--max-items \u5FC5\u987B\u4E3A1\u52301000\u7684\u6574\u6570\u3002");
    limit = Number(value);
  }
  return { paths, limit };
}
function projectResult(source, values) {
  const { paths, limit } = outputOptions(values);
  if (!paths.length && limit === void 0) return source;
  const tree = { terminal: false, children: /* @__PURE__ */ new Map() };
  for (const path of paths) {
    let node = tree;
    for (const segment of path.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
      if (!node.children.has(segment)) node.children.set(segment, { terminal: false, children: /* @__PURE__ */ new Map() });
      node = /** @type {Tree} */
      node.children.get(segment);
    }
    node.terminal = true;
  }
  const arrays = [];
  const escape = (key) => key.replaceAll("~", "~0").replaceAll("/", "~1");
  const visit = (value, node, path) => {
    const whole = !node || node.terminal;
    if (Array.isArray(value)) {
      const count2 = limit === void 0 ? value.length : Math.min(value.length, limit);
      if (count2 < value.length) arrays.push({ path, total: value.length, returned: count2 });
      return value.slice(0, count2).map((item, index) => {
        if (whole) return visit(item, void 0, `${path}/${index}`);
        const wildcard = node.children.get("*");
        const exact = node.children.get(String(index));
        const child = merge(wildcard, exact);
        return child ? visit(item, child, `${path}/${index}`) ?? null : null;
      });
    }
    if (isRecord(value)) {
      return Object.fromEntries(Object.entries(value).filter(([key]) => whole || node.children.has(key)).map(([key, item]) => [key, visit(item, whole ? void 0 : node.children.get(key), `${path}/${escape(key)}`)]));
    }
    return whole ? value : void 0;
  };
  const exists = (value, segments2) => {
    if (!segments2.length) return true;
    const [key, ...rest] = segments2;
    if (Array.isArray(value)) {
      if (key === "*") return value.some((item) => exists(item, rest));
      if (!/^(0|[1-9][0-9]*)$/.test(key)) return false;
    }
    if ((isRecord(value) || Array.isArray(value)) && Object.hasOwn(value, key)) return exists(
      /** @type {Record<string, unknown>} */
      value[key],
      rest
    );
    return false;
  };
  const data = visit(source, paths.length ? tree : void 0, "");
  return { data: data ?? null, output: { partial: paths.length > 0 || arrays.length > 0, selected_paths: paths, unmatched_paths: paths.filter((path) => !exists(source, path.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~")))), truncated_arrays: arrays } };
}
function merge(a, b) {
  if (!a) return b;
  if (!b) return a;
  const children = new Map(a.children);
  for (const [key, node] of b.children) children.set(
    key,
    /** @type {Tree} */
    merge(children.get(key), node)
  );
  return { terminal: a.terminal || b.terminal, children };
}

// src/command/tree.mjs
var CliOption = class extends Option {
  /** @param {string} flags @param {string} description */
  constructor(flags, description) {
    super(flags, description);
    this.negate = false;
  }
  attributeName() {
    return this.name();
  }
};
var metadata = /* @__PURE__ */ new WeakMap();
var repeatable = /* @__PURE__ */ new WeakSet();
var registrations = /* @__PURE__ */ new WeakMap();
var executableCommands = (root) => registrations.get(root) ?? [];
var commandMetadata = (command) => metadata.get(command);
function commandName(command) {
  return command.parent ? [commandName(command.parent), command.name()].filter(Boolean).join(" ") : "";
}
var commandNodes = (command) => command.commands.flatMap((child) => [child, ...commandNodes(child)]);
var findCommand = (root, name) => name ? commandNodes(root).find((command) => commandName(command) === name) : root;
var local = (value, locale) => Array.isArray(value) ? pick(locale, ...value) : value ?? "";
function usageError(code, locale, topic = "") {
  const hint = `heari ${topic ? `${topic} ` : ""}--help`;
  const messages = {
    "commander.missingArgument": ["Missing required argument.", "\u7F3A\u5C11\u5FC5\u586B\u4F4D\u7F6E\u53C2\u6570\u3002"],
    "commander.missingMandatoryOptionValue": ["Missing required option.", "\u7F3A\u5C11\u5FC5\u586B\u9009\u9879\u3002"],
    "commander.excessArguments": ["Unexpected positional argument.", "\u5305\u542B\u591A\u4F59\u4F4D\u7F6E\u53C2\u6570\u3002"],
    "commander.unknownCommand": ["Unknown command.", "\u672A\u77E5\u547D\u4EE4\u3002"],
    "commander.unknownOption": ["Invalid or unknown option.", "\u9009\u9879\u65E0\u6548\u6216\u672A\u77E5\u3002"],
    "commander.optionMissingArgument": ["Option value is missing.", "\u7F3A\u5C11\u9009\u9879\u503C\u3002"],
    "commander.invalidArgument": ["Invalid option value.", "\u9009\u9879\u503C\u65E0\u6548\u3002"],
    "commander.conflictingOption": ["Conflicting options.", "\u9009\u9879\u4E0D\u80FD\u540C\u65F6\u4F7F\u7528\u3002"]
  };
  const [en, zh] = messages[code] ?? ["Invalid command, option or argument.", "\u547D\u4EE4\u3001\u9009\u9879\u6216\u53C2\u6570\u65E0\u6548\u3002"];
  const error = new CliError("USAGE", `${en} Run ${hint}.`, `${zh} \u8BF7\u8FD0\u884C ${hint}\u3002`);
  error.locale = locale;
  throw error;
}
function makeOption(name, spec, locale) {
  const option = new CliOption(`${spec.short ? `-${spec.short}, ` : ""}--${name}${spec.type === "string" ? ` <${spec.valueName ?? "VALUE"}>` : ""}`, local(spec.description, locale));
  if (spec.multiple) {
    repeatable.add(option);
    option.argParser((value, previous) => [...previous ?? [], value]);
  }
  if (name === "lang") option.choices(["zh-CN", "en-US"]).default("zh-CN");
  if (name === "format") option.choices(["json", "text", "table"]).default("json");
  return option;
}
function commandValues(node) {
  const values = Object.fromEntries(Object.entries(node.optsWithGlobals()).filter(([name]) => node.getOptionValueSourceWithGlobals(name) !== "default"));
  return (
    /** @type {import('../types.js').Flags} */
    values
  );
}
function invocation(node, locale) {
  const spec = commandMetadata(node);
  if (!spec) usageError("commander.unknownCommand", locale, commandName(node));
  const values = commandValues(node);
  const problem = (en, zh) => {
    const error = new CliError("USAGE", `${en} Run heari ${commandName(node)} --help.`, `${zh} \u8BF7\u8FD0\u884C heari ${commandName(node)} --help\u3002`);
    error.locale = locale;
    throw error;
  };
  outputOptions(values, problem);
  const args = {};
  for (const option of node.options) if (option.mandatory && !String(values[option.name()] ?? "").trim()) usageError("commander.missingMandatoryOptionValue", locale, commandName(node));
  for (const [flag, field] of Object.entries(spec.fields ?? {})) if (values[flag] !== void 0) args[field] = values[flag];
  if (spec.id) args[spec.idField ?? "project_id"] = node.args[0];
  for (const rule of spec.constraints ?? []) if (rule.flag && rule.target_field) {
    const source = node.getOptionValue(rule.flag);
    if (source === void 0) continue;
    const raw = String(source);
    const value = rule.case_insensitive ? raw.toLowerCase() : raw;
    args[rule.target_field] = rule.normalize === "integer" ? Number(value) : rule.normalize === "upper" ? value.toUpperCase() : value;
  }
  const rules = (spec.constraints ?? []).filter((rule) => !rule.enum).map((rule) => ({
    ...rule,
    mutually_exclusive: rule.mutually_exclusive?.filter((group) => group.some((name) => !node.options.some((option) => option.name() === name)))
  }));
  applyConstraints(rules, values, problem);
  return { name: commandName(node), tool: spec.tool, args, values, locale };
}
function createProgram(locale = "zh-CN", onCommand = () => void 0) {
  const root = new Command("heari");
  registrations.set(root, []);
  root.description(pick(locale, "heari \u2014 \u5728\u7EC8\u7AEF\u5F00\u5C55\u7528\u6237\u7814\u7A76", "heari \u2014 User research from your terminal"));
  const configure = (node) => {
    node.allowExcessArguments(false).showSuggestionAfterError(false).helpCommand(false);
    node.helpOption("-h, --help", local(globalOptions.help.description, locale));
    node.configureOutput({ writeOut: () => {
    }, writeErr: () => {
    } });
    node.exitOverride((error) => {
      throw error;
    });
    configureHelp(node, locale, commandMetadata, commandName);
    return node;
  };
  configure(root);
  for (const [name, spec] of Object.entries(globalOptions)) if (name !== "help") root.addOption(makeOption(name, spec, locale));
  root.version(VERSION, "--version", local(rootOptions.version.description, locale));
  root.addOption(makeOption("help-all", rootOptions["help-all"], locale));
  registerCommands((name, spec) => {
    let node = root;
    for (const part of name.split(" ")) {
      const parent = node;
      node = parent.commands.find((child) => child.name() === part) ?? configure(parent.command(part));
    }
    metadata.set(node, spec);
    registrations.get(root)?.push(node);
    node.description(local(spec.description, locale));
    if (spec.id) {
      const name2 = spec.idName ?? "study-id";
      const descriptions = {
        "study-id": ["\u7814\u7A76 UUID\uFF1B\u901A\u8FC7 heari studies list \u83B7\u53D6\u3002", "Study UUID; find it with heari studies list."],
        "report-id": ["\u62A5\u544A UUID\uFF1B\u901A\u8FC7\u751F\u6210\u62A5\u544A\u6216 heari reports STUDY_UUID \u83B7\u53D6\u3002", "Report UUID; returned by report generation or heari reports STUDY_UUID."],
        "insight-id": ["\u6D1E\u5BDF UUID\uFF1B\u901A\u8FC7 heari findings STUDY_UUID \u83B7\u53D6\u3002", "Insight UUID; find it with heari findings STUDY_UUID."],
        "interview-id": ["\u8BBF\u8C08 UUID\uFF1B\u901A\u8FC7 heari interviews list STUDY_UUID \u83B7\u53D6\u3002", "Interview UUID; find it with heari interviews list STUDY_UUID."],
        "job-id": ["\u5BF9\u5E94\u5206\u6790\u6216\u5BFC\u51FA\u4EFB\u52A1\u8FD4\u56DE\u7684 UUID\u3002", "UUID returned by the corresponding analysis or export job."]
      };
      node.addArgument(new Argument(`<${name2}>`, local(descriptions[name2], locale)));
    }
    for (const [name2, item] of Object.entries(spec.options ?? {})) {
      const option = makeOption(name2, item, locale);
      if (spec.required?.includes(name2)) option.makeOptionMandatory();
      for (const rule of spec.constraints ?? []) {
        for (const group of rule.mutually_exclusive ?? []) if (group.includes(name2)) option.conflicts(group.filter((other) => other !== name2));
        if (rule.flag === name2 && rule.enum) {
          option.choices(rule.enum);
          if (rule.default !== void 0) option.default(rule.default);
          if (rule.case_insensitive) option.argParser((value) => {
            if (!rule.enum?.includes(value.toLowerCase())) throw new InvalidArgumentError("Invalid option value.");
            return value;
          });
        }
      }
      node.addOption(option);
    }
    node.action(() => onCommand(invocation(node, locale), node));
  });
  for (const node of [root, ...commandNodes(root)]) {
    if (node !== root && !commandMetadata(node)) {
      node.description(pick(locale, `\u7BA1\u7406 ${node.name()} \u547D\u4EE4`, `Work with ${node.name()} commands`));
      node.action(() => node.help());
    }
  }
  root.action(() => root.help());
  root.command("help [topic...]").helpOption(false).addOption(new CliOption("-h, --help", local(globalOptions.help.description, locale))).description(pick(locale, "\u67E5\u770B\u547D\u4EE4\u5E2E\u52A9", "Show command help")).action((topics, _options, help) => {
    const topic = topics.join(" ");
    const target = findCommand(root, topic);
    if (!target) usageError("commander.unknownCommand", locale);
    help.configureOutput({ writeOut: () => {
    }, writeErr: () => {
    } });
    target.help();
  });
  return root;
}
function catalogue(locale = "zh-CN") {
  const root = createProgram(locale);
  return Object.fromEntries(executableCommands(root).map((node) => {
    const spec = (
      /** @type {import('../types.js').CommandSpec} */
      commandMetadata(node)
    );
    return [commandName(node), {
      ...spec,
      description: node.description(),
      id: node.registeredArguments.length > 0,
      ...node.registeredArguments.length ? { idName: node.registeredArguments[0].name() } : {},
      options: Object.fromEntries(node.options.map((option) => [option.name(), describeOption(option)])),
      required: node.options.filter((option) => option.mandatory).map((option) => option.name())
    }];
  }));
}
function describeOption(option) {
  return {
    type: option.required || option.optional ? "string" : "boolean",
    ...option.short ? { short: option.short.slice(1) } : {},
    ...repeatable.has(option) ? { multiple: true } : {},
    ...option.required ? { valueName: option.flags.match(/<(.+)>/)?.[1] } : {},
    description: option.description
  };
}

// src/command/parse.mjs
function discover(argv) {
  const root = createProgram();
  const probe = new Command().helpOption(false).allowUnknownOption().allowExcessArguments();
  const language = root.options.find((option) => option.name() === "lang");
  if (language) probe.addOption(new Option(language.flags));
  probe.configureOutput({ writeOut: () => {
  }, writeErr: () => {
  } }).exitOverride((error) => {
    throw error;
  });
  try {
    probe.parse(argv, { from: "user" });
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
  }
  const selected = probe.opts().lang;
  const locale = (
    /** @type {import('../types.js').Locale} */
    selected === "en-US" ? "en-US" : "zh-CN"
  );
  const beforeBoundary = argv.slice(0, argv.indexOf("--") < 0 ? argv.length : argv.indexOf("--"));
  return { locale, invalidLocale: selected !== void 0 && !["zh-CN", "en-US", "--help", "-h"].includes(selected), help: beforeBoundary.some((value) => ["--help", "-h", "--help-all"].includes(value)), advanced: beforeBoundary.includes("--help-all") };
}
function prepare(argv, action, configure) {
  const found = discover(argv);
  if (found.invalidLocale) usageError("commander.invalidArgument", found.locale);
  let parsed;
  let helpText = "";
  const root = createProgram(found.locale, (command, node) => {
    parsed = command;
    return action?.(command, node);
  });
  if (!found.help && argv.slice(0, argv.indexOf("--") < 0 ? argv.length : argv.indexOf("--")).includes("--version")) {
    const version = new Command("heari").helpOption(false).allowExcessArguments(false).action(() => {
    });
    for (const option of root.options) version.addOption(option);
    version.configureOutput({ writeOut: () => {
    }, writeErr: () => {
    } });
    version.exitOverride((error) => usageError(error.code, found.locale));
    version.parse(argv, { from: "user" });
  }
  configure?.((name, handler) => {
    const node = findCommand(root, name);
    if (!node || !commandMetadata(node)) throw new Error("Unregistered workflow action");
    node.action(() => {
      parsed = invocation(node, found.locale);
      return action?.(parsed, node, handler);
    });
  });
  const showHelp = (node) => {
    const target = found.advanced ? root : node;
    parsed = { help: true, topic: commandName(target), ...found.advanced ? { advanced: true } : {}, locale: found.locale };
    let text = "";
    target.configureOutput({ writeOut: (value) => {
      text += value;
    }, writeErr: () => {
    } });
    target.outputHelp();
    if (found.advanced) for (const leaf of commandNodes(root).filter((command) => commandMetadata(command))) {
      leaf.configureOutput({ writeOut: (value) => {
        text += `
${value}`;
      }, writeErr: () => {
      } });
      leaf.outputHelp();
    }
    helpText = text;
  };
  root.hook("preAction", (_this, selected) => {
    if (found.help && commandName(selected) !== "help") {
      showHelp(selected);
      throw new CommanderError(0, "commander.helpDisplayed", "");
    }
  });
  for (const node of [root, ...commandNodes(root)]) {
    node.configureOutput({ writeOut: () => {
    }, writeErr: () => {
    } });
    node.exitOverride((error) => {
      if (error.code === "commander.version") {
        if (found.help) {
          showHelp(root);
          throw new CommanderError(0, "commander.helpDisplayed", "");
        }
        parsed = { version: true, locale: found.locale };
        throw error;
      }
      if (error.code === "commander.helpDisplayed" || error.code === "commander.help" || found.help && error.code !== "commander.unknownCommand") {
        showHelp(node);
        throw new CommanderError(0, "commander.helpDisplayed", "");
      }
      usageError(error.code, found.locale, commandName(node));
    });
  }
  root.on("option:help-all", () => {
    showHelp(root);
    throw new CommanderError(0, "commander.helpDisplayed", "");
  });
  const help = findCommand(root, "help");
  help?.action((topics) => {
    const target = findCommand(root, topics.join(" "));
    if (!target) usageError("commander.unknownCommand", found.locale);
    showHelp(target);
    throw new CommanderError(0, "commander.helpDisplayed", "");
  });
  const finish = () => {
    if (!parsed) usageError("commander.unknownCommand", found.locale);
    return { command: parsed, helpText };
  };
  const caught = (error) => {
    if (!(error instanceof CommanderError && ["commander.helpDisplayed", "commander.version"].includes(error.code))) throw error;
  };
  return { root, finish, caught };
}
async function runProgram(argv, action, configure) {
  const parser = prepare(argv, action, configure);
  try {
    await parser.root.parseAsync(argv, { from: "user" });
  } catch (error) {
    parser.caught(error);
  }
  return parser.finish();
}

// src/core/validation.mjs
function endpoint(value) {
  let url;
  try {
    url = new URL(
      /** @type {string} */
      value
    );
  } catch {
    fail("CONFIG", "Provide a valid server URL. Run heari login --help for login steps.", "\u8BF7\u63D0\u4F9B\u6709\u6548\u7684\u670D\u52A1\u5730\u5740\u3002\u8FD0\u884C heari login --help \u67E5\u770B\u767B\u5F55\u6B65\u9AA4\u3002");
  }
  if (url.username || url.password || url.search || url.hash) fail("CONFIG", "Endpoint must not contain credentials, query or fragment.", "\u670D\u52A1\u5730\u5740\u4E0D\u80FD\u5305\u542B\u7528\u6237\u540D\u3001\u5BC6\u7801\u3001\u67E5\u8BE2\u53C2\u6570\u6216\u7247\u6BB5\u3002");
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) fail("CONFIG", "HTTPS is required except on loopback.", "\u8FDC\u7A0B\u670D\u52A1\u5FC5\u987B\u4F7F\u7528 HTTPS\uFF0C\u4EC5\u672C\u5730\u56DE\u73AF\u5730\u5740\u5141\u8BB8 HTTP\u3002");
  return url.href;
}
function tokenValue(value) {
  const token = (
    /** @type {string | undefined} */
    value?.trim()
  );
  if (!token || token.length > 4096 || /\s/.test(token)) fail("AUTH", "Provide a personal access token via login --token-stdin or HEARI_TOKEN. Run heari login --help.", "\u8BF7\u901A\u8FC7 login --token-stdin \u6216 HEARI_TOKEN \u63D0\u4F9B\u4E2A\u4EBA\u8BBF\u95EE\u4EE4\u724C\u3002\u8FD0\u884C heari login --help \u67E5\u770B\u6B65\u9AA4\u3002");
  return token;
}

// src/core/result-contracts.mjs
var analysisStates = ["PENDING", "RUNNING", "RETRY", "SUCCEEDED", "DEAD_LETTER", "CANCELLED"];
var reportStates = ["DRAFT", "PUBLISHED", "SUPERSEDED"];
var exportStates = ["PENDING", "RUNNING", "RETRY", "READY", "DEAD_LETTER", "EXPIRING", "EXPIRED", "REVOKED"];
var id = "11111111-1111-4111-8111-111111111111";
var uuid = { type: "string", pattern: "^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$" };
var object = (properties, required) => ({ type: "object", properties, required, additionalProperties: true });
var study = object({ study_id: { type: "string", minLength: 1 }, created: { type: "boolean" }, guide_drafted: { type: "boolean" } }, ["study_id"]);
var research = { anyOf: [
  object({ created: { const: false } }, ["created"]),
  object({ ...study.properties, created: { const: true } }, ["created", "study_id"])
] };
var analysisJob = object({ id: uuid, status: { type: "string", enum: analysisStates } }, ["id", "status"]);
var exportJob = object({ id: uuid, status: { type: "string", enum: exportStates } }, ["id", "status"]);
var analysisPreview = object({ started: { const: false }, status: { const: "CONFIRMATION_REQUIRED" } }, ["started", "status"]);
var exportPreview = object({ created: { const: false }, preview: object({}, []) }, ["created", "preview"]);
var download = object({ downloaded: { const: true }, output: { type: "string" }, bytes: { type: "integer", minimum: 0 }, sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } }, ["downloaded", "output", "bytes", "sha256"]);
var nonempty = { type: "string", minLength: 1 };
var fingerprint = { type: "string", pattern: "^[a-f0-9]{64}$" };
var proposal = object({ id: nonempty }, ["id"]);
var guideShow = object({ study_id: nonempty, protocol: object({}, []) }, ["study_id", "protocol"]);
var guideEdit = { anyOf: [
  object({ applied: { const: false }, turn_id: nonempty, edit_proposal: { const: null } }, ["applied", "turn_id"]),
  object({ applied: { const: false }, turn_id: nonempty, chat_id: nonempty, edit_proposal: proposal }, ["applied", "turn_id", "chat_id", "edit_proposal"])
] };
var guideApply = { anyOf: [
  object({ applied: { type: "boolean" }, edit_proposal: { const: null } }, ["applied"]),
  object({ applied: { type: "boolean" }, chat_id: nonempty, edit_proposal: proposal }, ["applied", "chat_id", "edit_proposal"])
] };
var studyStatus = object({ id: uuid, name: { type: "string" }, stage: { type: "string" }, completed_interviews: { type: "integer", minimum: 0 } }, ["id", "name", "stage", "completed_interviews"]);
var reportIdentity = object({ id: uuid }, ["id"]);
var reportShow = { anyOf: [
  object({ report_id: uuid, available: { const: true }, fingerprint, report: reportIdentity }, ["report_id", "available", "fingerprint", "report"]),
  object({ report_id: uuid, available: { const: false }, reason: { const: "SOURCE_INVALID" }, report: false }, ["report_id", "available", "reason"])
] };
var reportEdit = { anyOf: [
  object({ edited: { const: false }, fingerprint, before: reportIdentity, after: reportIdentity }, ["edited", "fingerprint", "before", "after"]),
  object({ edited: { const: true }, fingerprint, report: reportIdentity }, ["edited", "fingerprint", "report"])
] };
var publishedStudy = { anyOf: [
  object({ published: { const: false } }, ["published"]),
  object({ published: { const: true }, study_id: uuid, protocol_id: uuid }, ["published", "study_id", "protocol_id"])
] };
var reportState = object({ id: uuid, status: { type: "string", enum: reportStates } }, ["id", "status"]);
var generatedReport = { anyOf: [
  object({ created: { const: false }, status: { const: "CONFIRMATION_REQUIRED" } }, ["created", "status"]),
  reportState
] };
var publishedReport = { anyOf: [
  object({ published: { const: false }, report: reportIdentity }, ["published", "report"]),
  reportState
] };
var reviewedInsight = object({ reviewed: { type: "boolean" }, fingerprint, insight: object({ id: uuid, project_id: uuid }, ["id", "project_id"]) }, ["reviewed", "fingerprint", "insight"]);
var count = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
var nextOffset = { anyOf: [{ const: null }, { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER }] };
var interviewIdentity = object({ id: uuid, study_id: uuid }, ["id", "study_id"]);
var studyList = object({ total: count, projects: { type: "array", items: object({ id: uuid, name: { type: "string" }, stage: { type: "string" } }, ["id", "name", "stage"]) } }, ["total", "projects"]);
var interviewList = object({ study_id: uuid, total: count, next_offset: nextOffset, interviews: { type: "array", items: interviewIdentity } }, ["study_id", "total", "next_offset", "interviews"]);
var interviewShow = object({ ...interviewIdentity.properties, interview_version: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, quality: object({}, []) }, ["id", "study_id", "interview_version", "quality"]);
var transcriptTurn = object({ id: uuid, sequence: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, speaker: { type: "string" }, text: { type: "string" } }, ["id", "sequence", "speaker", "text"]);
var transcript = { anyOf: [
  object({ interview_id: uuid, interview_version: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, available: { const: true }, total: count, next_offset: nextOffset, turns: { type: "array", items: transcriptTurn } }, ["interview_id", "interview_version", "available", "total", "next_offset", "turns"]),
  object({ interview_id: uuid, interview_version: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, available: { const: false }, reason: { enum: ["CONSENT_REQUIRED", "CONSENT_WITHDRAWN", "INTERVIEW_CHANGED"] }, total: { const: 0 }, next_offset: { const: null }, turns: { type: "array", maxItems: 0 } }, ["interview_id", "interview_version", "available", "reason", "total", "next_offset", "turns"])
] };
var strings = { type: "array", items: { type: "string" } };
var findings = object({ insights: { type: "array", items: object({ id: uuid, title: { type: "string" }, conclusion: { type: "string" }, review_status: { type: "string" }, evidence_ids: { type: "array", items: uuid }, quotes: { type: "array", items: object({ id: uuid, quote: { type: "string" } }, ["id", "quote"]) } }, ["id", "title", "conclusion", "review_status", "evidence_ids", "quotes"]) }, url: { type: "string" } }, ["insights", "url"]);
var quoteSearch = object({ quotes: { type: "array", items: object({ id: uuid, project_id: uuid, quote: { type: "string" } }, ["id", "project_id", "quote"]) }, url: { type: "string" } }, ["quotes", "url"]);
var knowledgeAnswer = object({ answer: { type: "string" }, sufficient: { type: "boolean" }, caveats: strings, citations: { type: "array", items: object({ number: { type: "integer", minimum: 1 }, project: { type: "string" }, participant: { anyOf: [{ type: "string" }, { const: null }] }, text: { type: "string" } }, ["number", "project", "participant", "text"]) }, url: { type: "string" } }, ["answer", "sufficient", "caveats", "citations", "url"]);
var contactReceipt = { anyOf: [
  object({ study_id: uuid, status: { const: "NOT_SUBMITTED" }, requires_confirmation: { const: true }, available: { type: "boolean" } }, ["study_id", "status", "requires_confirmation", "available"]),
  object({ request_id: uuid, study_id: uuid, status: { type: "string" }, attempts: count }, ["request_id", "study_id", "status", "attempts"])
] };
var errorResultSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  ...object({ error: object({ code: { type: "string" }, message: { type: "string" }, operation_may_have_completed: { type: "boolean" }, job_id: uuid, status: { type: "string" }, tool_code: { type: "string" }, rpc_code: { type: "integer" }, http_status: { type: "number" }, turn_id: uuid, output_stream: { enum: ["stdout", "stderr"] } }, ["code", "message"]) }, ["error"])
};
function resultContract(name, locale) {
  const t = (zh, en) => pick(locale, zh, en);
  const studyCompletion = {
    resource_exists: { field: "study_id", test: "nonempty-string" },
    guide_ready: { field: "guide_drafted", equals: true, missing: "unverified" },
    next_command: "guide show",
    note: t("\u7814\u7A76\u5DF2\u5B58\u5728\u4E0D\u4EE3\u8868\u63D0\u7EB2\u5C31\u7EEA\u6216\u5DF2\u53D1\u5E03\u3002\u63D0\u7EB2\u672A\u5B8C\u6210\u65F6\u7EE7\u7EED\u7F16\u8F91\u540C\u4E00\u7814\u7A76\uFF0C\u4E0D\u8981\u91CD\u5EFA\u3002", "An existing study does not establish guide readiness or publication. Continue editing the same study when guide work is incomplete; do not recreate it.")
  };
  const pending = ["PENDING", "RUNNING", "RETRY"];
  const jobCompletion = (analysis) => ({
    status_field: "status",
    identity_field: "id",
    success_states: [analysis ? "SUCCEEDED" : "READY"],
    pending_states: pending,
    failure_states: (analysis ? analysisStates : exportStates).filter((state) => !pending.includes(state) && state !== (analysis ? "SUCCEEDED" : "READY")),
    next_command: analysis ? "analysis status" : "reports export-status",
    polling_flag: "--wait",
    one_shot_exit_zero_is_business_success: false,
    local_cancellation_cancels_server_job: false,
    note: analysis ? t("\u4EFB\u52A1\u7F16\u53F7\u8868\u793A\u5DF2\u53D7\u7406\uFF1B\u4EC5 SUCCEEDED \u8868\u793A\u5206\u6790\u6210\u529F\u3002\u5355\u6B21\u67E5\u8BE2\u5931\u8D25\u72B6\u6001\u4ECD\u53EF\u9000\u51FA0\uFF1B--wait \u9047\u5931\u8D25\u72B6\u6001\u9000\u51FA1\u3002", "A job ID establishes acceptance; only SUCCEEDED establishes analysis success. A one-shot failure-state query can exit 0; --wait exits 1 on failure states.") : t("READY \u8868\u793A\u53EF\u5C1D\u8BD5\u4E0B\u8F7D\uFF1B\u4ECD\u9700\u901A\u8FC7\u4E0B\u8F7D\u6743\u9650\u3001\u6709\u6548\u671F\u53CA\u6587\u4EF6\u6821\u9A8C\u3002\u5355\u6B21\u67E5\u8BE2\u5931\u8D25\u72B6\u6001\u4ECD\u53EF\u9000\u51FA0\uFF1B--wait \u9047\u5931\u8D25\u72B6\u6001\u9000\u51FA1\u3002", "READY permits a download attempt, subject to download authorization, expiry and file checks. A one-shot failure-state query can exit 0; --wait exits 1 on failure states.")
  });
  const contracts = {
    findings: { schema: findings, completion: { snapshot_only: true, review_field: "insights[].review_status", empty_is_not_proof_of_no_findings: true, note: t("\u7A7A\u6570\u7EC4\u53EF\u80FD\u8868\u793A\u5C1A\u65E0\u6709\u6548\u5206\u6790\u7ED3\u679C\uFF1B\u6D1E\u5BDF\u987B\u7ED3\u5408\u5BA1\u6838\u72B6\u6001\u548C\u8BC1\u636E\u9605\u8BFB\uFF0C\u4E0D\u636E\u6B64\u58F0\u79F0\u5DF2\u5B8C\u6210\u5206\u6790\u3002", "An empty array can mean no valid analysis yet. Inspect review status and evidence; successful reading does not establish analysis completion.") }, examples: [{ insights: [], url: "https://example.invalid/analysis" }] },
    "quotes search": { schema: quoteSearch, completion: { snapshot_only: true, returned_items_only: true, note: t("\u53EA\u4EE3\u8868\u672C\u6B21\u8FD4\u56DE\u7684\u539F\u8BDD\u4E0E\u6765\u6E90\uFF0C\u4E0D\u4EE3\u8868\u68C0\u7D22\u4E86\u6240\u6709\u7814\u7A76\u6216\u5DF2\u9A8C\u8BC1\u7ED3\u8BBA\u3002", "Only the returned quotes and sources are established, not exhaustive research coverage or a verified conclusion.") }, examples: [{ quotes: [], url: "https://example.invalid/knowledge" }] },
    "knowledge ask": { schema: knowledgeAnswer, completion: { sufficiency_field: "sufficient", citations_field: "citations", caveats_field: "caveats", note: t("\u68C0\u67E5 sufficient\u3001caveats \u548C\u5F15\u7528\uFF1B\u8BC1\u636E\u4E0D\u8DB3\u987B\u5982\u5B9E\u62A5\u544A\uFF0C\u4E0D\u4EE5\u56DE\u7B54\u751F\u6210\u6210\u529F\u4EE3\u66FF\u7814\u7A76\u7ED3\u8BBA\u5DF2\u9A8C\u8BC1\u3002", "Inspect sufficient, caveats and citations. Report insufficient evidence; generation success does not establish a verified conclusion.") }, examples: [{ answer: "Evidence is insufficient.", sufficient: false, caveats: ["Synthetic example only."], citations: [], url: "https://example.invalid/knowledge" }] },
    contact: { schema: contactReceipt, completion: { status_field: "status", not_submitted_state: "NOT_SUBMITTED", accepted_state: "QUEUED", mail_server_accepted_state: "SENT", team_reply_established: false, participant_invitations_sent: false, note: t("NOT_SUBMITTED \u672A\u63D0\u4EA4\uFF1BQUEUED \u4EC5\u6392\u961F\uFF1BSENT \u4EC5\u8868\u793A\u90AE\u4EF6\u670D\u52A1\u5668\u63A5\u6536\uFF0C\u4E0D\u8868\u793A\u56E2\u961F\u56DE\u590D\u6216\u53D1\u9001\u4E86\u8BBF\u8C08\u9080\u8BF7\u3002", "NOT_SUBMITTED is not a submission; QUEUED is queued; SENT only establishes mail-server acceptance, not a team reply or participant invitations.") }, examples: [{ study_id: id, status: "NOT_SUBMITTED", requires_confirmation: true, available: false }, { request_id: id, study_id: id, status: "QUEUED", attempts: 0 }] },
    research: { schema: research, completion: { ...studyCompletion, created_field: "created", not_created_value: false, before_creation: { questions: "ask-researcher-if-nonempty", confirmation: "review-and-save-entire-preview-if-present", submit_flags: ["--brief-file", "--confirm", "--no-input"], cancelled_status: "CANCELLED", consent_required: true } }, examples: [{ created: false, questions: [{ question: "Which users?" }] }, { created: true, study_id: id, guide_drafted: false }, { created: true, study_id: id, guide_drafted: true }] },
    "guide show": { schema: guideShow, completion: { snapshot_only: true, mutation: false, note: t("\u8BFB\u53D6\u5F53\u524D\u63D0\u7EB2\uFF0C\u4E0D\u521B\u5EFA\u6216\u4FDD\u5B58\uFF1B\u8BFB\u53D6\u6210\u529F\u4E0D\u4EE3\u8868\u63D0\u7EB2\u5DF2\u5BA1\u6838\u6216\u7814\u7A76\u5DF2\u53D1\u5E03\u3002", "Reads the current guide without creating or saving; a successful read does not establish review or study publication.") }, examples: [{ study_id: id, protocol: { id, status: "DRAFT" } }] },
    "guide edit": { schema: guideEdit, completion: { saved_guide: false, proposal_field: "edit_proposal", proposal_id_field: "edit_proposal.id", chat_id_field: "chat_id", recovery_identity_field: "turn_id", next_command: "guide apply", execution_flag: "--confirm", note: t("\u4EC5\u4FDD\u5B58\u5BF9\u8BDD\u548C\u5019\u9009\uFF0C\u4E0D\u4FDD\u5B58\u63D0\u7EB2\u3002\u6709\u5019\u9009\u65F6\u5BA1\u9605\u539F\u5019\u9009\u5E76\u4FDD\u7559chat_id\u53CA\u5019\u9009id\u518D\u786E\u8BA4\uFF1B\u65E0\u5019\u9009\u65F6\u6309reply\u6F84\u6E05\u3002", "Saves conversation and proposals, not the guide. Review the original candidate and retain its chat_id and proposal ID before confirmation; without a proposal, follow reply to clarify.") }, examples: [{ applied: false, turn_id: id, edit_proposal: null }, { applied: false, turn_id: id, chat_id: id, edit_proposal: { id } }] },
    "guide apply": { schema: guideApply, completion: { saved: { field: "applied", equals: true }, not_saved: { field: "applied", equals: false }, execution_flag: "--confirm", readback_command: "guide show", note: t("\u4EC5applied=true\u8868\u793A\u672C\u6B21\u5DF2\u5E94\u7528\uFF1B\u5DF2\u786E\u8BA4\u4F46applied=false\u4ECD\u672A\u5E94\u7528\uFF0C\u53EF\u80FD\u662F\u9648\u65E7\u6216\u5DF2\u5904\u7406\u5019\u9009\u3002\u5148\u8BFB\u56DE\u63D0\u7EB2\uFF0C\u4E0D\u81EA\u52A8\u91CD\u653E\u6216\u63A8\u65AD\u5DF2\u53D1\u5E03\u3002", "Only applied=true establishes application by this invocation. Confirmed applied=false still means not applied, including stale or processed proposals. Read the guide back; do not automatically replay or infer publication.") }, examples: [{ applied: false, status: "REVIEW_REQUIRED" }, { applied: false, kind: "REPLY" }, { applied: true, study_id: id }] },
    "studies status": { schema: studyStatus, completion: { snapshot_only: true, identity_field: "id", business_completion: "not-inferred-from-stage-or-counts", invitation_delivery: "not-established-by-link-counts", note: t("\u9636\u6BB5\u662F\u540E\u7AEF\u5C55\u793A\u5B57\u7B26\u4E32\uFF0C\u4E0D\u662F\u4EFB\u52A1\u7EC8\u6001\u3002\u8BBF\u8C08\u6570\u91CF\u4E0D\u8BC1\u660E\u5206\u6790\u6210\u529F\u6216\u62A5\u544A\u53D1\u5E03\uFF1B\u53EF\u9009analysis/report\u7F3A\u5931\u4E5F\u4E0D\u8BC1\u660E\u5931\u8D25\u3002\u9080\u8BF7\u94FE\u63A5\u72B6\u6001\u4E0D\u8BC1\u660E\u6E20\u9053\u9001\u8FBE\u3002", "Stage is a backend display string, not a job terminal state. Interview counts do not establish analysis success or report publication; absent optional analysis/report data does not establish failure. Invitation link state does not prove channel delivery.") }, examples: [{ id, name: "Synthetic study", stage: "\u8BBE\u8BA1\u4E2D", completed_interviews: 0 }] },
    "reports show": { schema: reportShow, completion: { available: { field: "available", equals: true }, unavailable: { field: "available", equals: false }, mutation: false, review_identity_field: "fingerprint", note: t("available=false\u3001SOURCE_INVALID\u8868\u793A\u6765\u6E90\u5931\u6548\u4E14\u4E0D\u8FD4\u56DE\u62A5\u544A\u5185\u5BB9\uFF1B\u9000\u51FA0\u53EA\u8868\u793A\u5DF2\u8BFB\u53D6\u53EF\u7528\u6027\uFF0C\u4E0D\u8BC1\u660E\u62A5\u544A\u53EF\u7528\u6216\u5DF2\u53D1\u5E03\u3002", "available=false with SOURCE_INVALID means invalidated sources and no report content. Exit 0 establishes an availability read, not report availability or publication.") }, examples: [{ report_id: id, available: true, fingerprint: "a".repeat(64), report: { id } }, { report_id: id, available: false, reason: "SOURCE_INVALID" }] },
    "reports edit": { schema: reportEdit, completion: { saved: { field: "edited", equals: true }, preview: { field: "edited", equals: false }, execution_flag: "--confirm", reviewed_fingerprint_flag: "--fingerprint", readback_command: "reports show", stale_error: { code: "TOOL", tool_code: "REPORT_EDIT_STALE" }, note: t("edited=false\u7684before/after\u53EA\u662F\u9884\u89C8\uFF1B\u786E\u8BA4\u65F6\u63D0\u4EA4\u5DF2\u5BA1\u9605\u6307\u7EB9\uFF0C\u9648\u65E7\u62D2\u7EDD\u540E\u91CD\u65B0\u8BFB\u56DE\u5E76\u5BA1\u9605\u3002edited=true\u4EC5\u8868\u793A\u4FDD\u5B58\u63AA\u8F9E\uFF0C\u4E0D\u53D1\u5E03\u62A5\u544A\uFF0C\u4E5F\u4E0D\u4FEE\u6539\u8BC1\u636E\u3002", "edited=false before/after is a preview. Confirm with the reviewed fingerprint; read back and review again after stale rejection. edited=true establishes saved wording, not report publication or evidence changes.") }, examples: [{ edited: false, fingerprint: "a".repeat(64), before: { id }, after: { id } }, { edited: true, fingerprint: "a".repeat(64), report: { id } }] },
    "studies publish": { schema: publishedStudy, completion: { published: { field: "published", equals: true }, preview: { field: "published", equals: false }, execution_flag: "--confirm", sends_invitations: false, note: t("\u4EC5published=true\u8868\u793A\u63D0\u7EB2\u5DF2\u53D1\u5E03\uFF1B\u9884\u89C8\u4E0D\u53D1\u5E03\uFF0C\u4E5F\u4E0D\u53D1\u9001\u8BBF\u8C08\u9080\u8BF7\u3002", "Only published=true establishes guide publication; a preview does not publish or send interview invitations.") }, examples: [{ published: false, status: "REVIEW_REQUIRED" }, { published: true, study_id: id, protocol_id: id }] },
    "reports generate": { schema: generatedReport, completion: { preview: { field: "created", equals: false }, identity_field: "id", status_field: "status", execution_flag: "--confirm", publication_not_implied: true, note: t("created=false\u8868\u793A\u5F85\u786E\u8BA4\u9884\u89C8\uFF1B\u8FD4\u56DE\u62A5\u544AID\u540E\u68C0\u67E5\u5B9E\u9645status\uFF0C\u4E0D\u5C06\u751F\u6210\u6216\u8BFB\u53D6\u5DF2\u6709\u62A5\u544A\u5F53\u4F5C\u53D1\u5E03\uFF0C\u4E5F\u4E0D\u81EA\u52A8\u5BA1\u6838\u6D1E\u5BDF\u3002", "created=false is a confirmation preview. After receiving a report ID inspect its actual status; generating or returning an existing report does not establish publication or automatic insight review.") }, examples: [{ created: false, status: "CONFIRMATION_REQUIRED" }, { id, status: "DRAFT" }] },
    "reports publish": { schema: publishedReport, completion: { preview: { field: "published", equals: false }, published: { field: "status", equals: "PUBLISHED" }, identity_field: "id", execution_flag: "--confirm", note: t("published=false\u548Creport\u662F\u9884\u89C8\uFF1B\u786E\u8BA4\u540E\u53EA\u6709\u5B9E\u9645status=PUBLISHED\u624D\u8BC1\u660E\u5DF2\u53D1\u5E03\uFF0CDRAFT\u6216SUPERSEDED\u4E0D\u80FD\u5F53\u4F5C\u53D1\u5E03\u6210\u529F\u3002", "published=false with report is a preview. After confirmation only actual status=PUBLISHED establishes publication; DRAFT or SUPERSEDED does not establish publishing success.") }, examples: [{ published: false, report: { id } }, { id, status: "PUBLISHED" }, { id, status: "SUPERSEDED" }] },
    "findings review": { schema: reviewedInsight, completion: { saved: { field: "reviewed", equals: true }, preview: { field: "reviewed", equals: false }, execution_flag: "--confirm", reviewed_fingerprint_flag: "--fingerprint", stale_error: { code: "TOOL", tool_code: "INSIGHT_REVIEW_STALE" }, readback_command: "findings", note: t("reviewed=true\u4EC5\u8868\u793A\u5BA1\u6838\u51B3\u5B9A\u5DF2\u8BB0\u5F55\uFF0C\u4E0D\u4EE3\u8868\u7ED3\u8BBA\u88AB\u63A5\u53D7\u3001\u62A5\u544A\u751F\u6210\u6216\u53D1\u5E03\u3002\u9648\u65E7\u6307\u7EB9\u62D2\u7EDD\u540E\u91CD\u65B0\u8BFB\u53D6\u5E76\u5BA1\u9605\uFF0C\u4E0D\u81EA\u52A8\u91CD\u653E\u3002", "reviewed=true only establishes that the review decision was recorded, not acceptance of the conclusion, report generation or publication. Read and review again after stale fingerprint rejection; do not automatically replay.") }, examples: [{ reviewed: false, fingerprint: "a".repeat(64), insight: { id, project_id: id } }, { reviewed: true, fingerprint: "a".repeat(64), insight: { id, project_id: id } }] },
    "studies list": { schema: studyList, completion: { snapshot_only: true, total_field: "total", items_field: "projects", server_result_cap: 30, total_may_exceed_returned_items: true, note: t("\u6700\u591A\u8FD4\u56DE30\u9879\uFF1Btotal\u53EF\u80FD\u5927\u4E8Eprojects\u957F\u5EA6\uFF0C\u6CA1\u6709\u5206\u9875flag\u3002\u7A7A\u7ED3\u679C\u4E0D\u8BC1\u660E\u5DE5\u4F5C\u533A\u5168\u5C40\u4E0D\u5B58\u5728\u7814\u7A76\uFF0C\u4E5F\u4E0D\u6539\u53D8\u8D26\u53F7\u53EF\u89C1\u8303\u56F4\u3002", "Returns at most 30 entries; total may exceed projects length and there are no pagination flags. An empty visible result does not establish global absence of studies or change account visibility.") }, examples: [{ total: 0, projects: [] }, { total: 31, projects: [{ id, name: "Synthetic study", stage: "\u8349\u7A3F" }] }] },
    "interviews list": { schema: interviewList, completion: { snapshot_only: true, items_field: "interviews", next_offset_field: "next_offset", complete_when: { field: "next_offset", equals: null }, continuation_flag: "--offset", note: t("next_offset\u975Enull\u65F6\u663E\u5F0F\u67E5\u8BE2\u540C\u4E00\u7814\u7A76\u4E0B\u4E00\u9875\uFF1B\u5217\u8868\u4EC5\u542B\u5143\u6570\u636E\uFF0C\u4E0D\u8BC1\u660E\u9010\u5B57\u7A3F\u53EF\u7528\u6216\u5206\u6790\u5B8C\u6210\u3002", "When next_offset is non-null, explicitly request the next page for the same study. Metadata does not establish transcript availability or analysis completion.") }, examples: [{ study_id: id, total: 0, interviews: [], next_offset: null }, { study_id: id, total: 2, interviews: [{ id, study_id: id }], next_offset: 1 }] },
    "interviews show": { schema: interviewShow, completion: { snapshot_only: true, source_version_field: "interview_version", quality_field: "quality", note: t("\u8D28\u91CF\u8BA1\u6570\u6CBF\u7528\u540E\u7AEF\u542B\u4E49\uFF0C\u4E0D\u7531CLI\u91CD\u7B97\uFF1B\u8BFB\u53D6\u5143\u6570\u636E\u4E0D\u4EE3\u8868\u5DF2\u540C\u610F\u8BBF\u95EE\u9010\u5B57\u7A3F\u3002", "Quality counters retain backend meanings and are not recomputed by the CLI. Reading metadata does not establish consent to access the transcript.") }, examples: [{ id, study_id: id, interview_version: 1, quality: {} }] },
    "interviews transcript": { schema: transcript, completion: { available: { field: "available", equals: true }, unavailable: { field: "available", equals: false }, source_version_field: "interview_version", continuation_flags: ["--offset", "--source-version"], next_offset_field: "next_offset", complete_when: { field: "next_offset", equals: null }, completeness_requires_available: true, note: t("\u4EC5available=true\u65F6\u8BFB\u53D6turns\uFF1B\u540E\u7EED\u9875\u987B\u7ED1\u5B9A\u8FD4\u56DE\u7684interview_version\u3002available=false\u4E0D\u662F\u7A7A\u7684\u5B8C\u6574\u9010\u5B57\u7A3F\uFF0C\u64A4\u56DE\u540C\u610F\u6216\u7248\u672C\u53D8\u5316\u540E\u4E0D\u5F97\u62FC\u63A5\u65E7\u9875\uFF1B\u5148\u6838\u5BF9\u6765\u6E90\u518D\u7EE7\u7EED\u3002", "Read turns only when available=true; subsequent pages must bind the returned interview_version. available=false is not an empty complete transcript. Do not stitch old pages after consent withdrawal or source changes; inspect the source before continuing.") }, examples: [{ interview_id: id, interview_version: 1, available: true, total: 1, turns: [{ id, sequence: 1, speaker: "PARTICIPANT", text: "Synthetic source" }], next_offset: null }, { interview_id: id, interview_version: 2, available: false, reason: "INTERVIEW_CHANGED", total: 0, turns: [], next_offset: null }] },
    "studies create": { schema: study, completion: studyCompletion, examples: [{ study_id: id, created: true, guide_drafted: false }, { study_id: id, created: true, guide_drafted: true }] },
    "analysis start": { schema: { anyOf: [analysisPreview, analysisJob] }, completion: { ...jobCompletion(true), preview: { field: "started", equals: false }, execution_flag: "--confirm" }, examples: [{ started: false, status: "CONFIRMATION_REQUIRED" }, { id, status: "PENDING" }] },
    "analysis status": { schema: analysisJob, completion: jobCompletion(true), examples: [{ id, status: "RUNNING" }, { id, status: "SUCCEEDED" }, { id, status: "DEAD_LETTER" }] },
    "reports export": { schema: { anyOf: [exportPreview, exportJob] }, completion: { ...jobCompletion(false), preview: { field: "created", equals: false }, execution_flag: "--confirm", idempotency_flag: "--idempotency-key" }, examples: [{ created: false, preview: {} }, { id, status: "PENDING" }] },
    "reports export-status": { schema: exportJob, completion: jobCompletion(false), examples: [{ id, status: "READY" }, { id, status: "EXPIRED" }] },
    "reports download": { schema: download, completion: { success: { field: "downloaded", equals: true }, file_verified: ["origin", "size", "sha256", "exclusive-create"], note: t("\u4EC5 downloaded=true \u8868\u793A\u5DF2\u5B8C\u6210\u6821\u9A8C\u5E76\u5199\u5165\u672C\u5730\u6587\u4EF6\uFF1B\u4E0D\u4F1A\u8986\u76D6\u5DF2\u6709\u6587\u4EF6\u3002", "downloaded=true establishes verified local file creation; existing files are never overwritten.") }, examples: [{ downloaded: true, output: "/tmp/synthetic-report.pdf", bytes: 0, sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" }] }
  };
  const contract = contracts[name];
  if (!contract) return void 0;
  return {
    contract_version: 1,
    coverage: "client-visible-minimum",
    scope: "unprojected-json-result",
    schema: { $schema: "https://json-schema.org/draft/2020-12/schema", ...contract.schema },
    completion: contract.completion,
    examples: contract.examples,
    unknown_fields: "preserved",
    recovery: t("\u9000\u51FA0\u4E0D\u8BC1\u660E\u4E1A\u52A1\u5168\u90E8\u5B8C\u6210\u3002\u8D85\u65F6\u3001\u4E2D\u65AD\u3001\u534F\u8BAE\u6216\u8F93\u51FA\u9519\u8BEF\u4E0D\u8BC1\u660E\u56DE\u6EDA\uFF1B\u5148\u67E5\u8BE2\u540C\u4E00\u7814\u7A76\u6216\u4EFB\u52A1\uFF0C\u5199\u64CD\u4F5C\u4E0D\u81EA\u52A8\u91CD\u8BD5\u3002", "Exit 0 does not establish full business completion. Timeout, interruption, protocol or output errors do not establish rollback; inspect the same study or job before retrying. Writes are never automatically retried.")
  };
}

// src/transport/tool-results.mjs
function readToolResult(name, args, result) {
  if (result.isError) {
    const error = new CliError(
      "TOOL",
      "Tool rejected the request. Check permissions and operation status before retrying.",
      "\u5DE5\u5177\u62D2\u7EDD\u8BF7\u6C42\u3002\u8BF7\u6838\u5BF9\u6743\u9650\u548C\u64CD\u4F5C\u72B6\u6001\u540E\u518D\u51B3\u5B9A\u662F\u5426\u91CD\u8BD5\u3002"
    );
    const detail = isRecord(result.structuredContent) && isRecord(result.structuredContent.error) ? result.structuredContent.error : void 0;
    if (detail && typeof detail.code === "string" && ["IDENTITY_REQUIRED", "TOKEN_READ_ONLY", "ROLE_FORBIDDEN", "RATE_LIMITED", "EXECUTION_SCOPE_REQUIRED", "INSIGHT_REVIEW_STALE", "REPORT_EDIT_STALE"].includes(detail.code)) error.tool_code = detail.code;
    if (name === "create_study" && !error.tool_code) {
      error.operation_may_have_completed = true;
      error.message = "Creation outcome is unknown; the study may already exist. Run heari studies list and inspect the existing study before retrying. No retry was made.";
      error.chinese = "\u521B\u5EFA\u7ED3\u679C\u672A\u77E5\uFF0C\u7814\u7A76\u53EF\u80FD\u5DF2\u5B58\u5728\u3002\u8BF7\u5148\u8FD0\u884C heari studies list \u5E76\u6838\u5BF9\u5DF2\u6709\u7814\u7A76\uFF0C\u4E0D\u8981\u76F4\u63A5\u91CD\u5EFA\uFF1B\u672A\u81EA\u52A8\u91CD\u8BD5\u3002";
    }
    throw error;
  }
  if (!isRecord(result.structuredContent)) fail("PROTOCOL", "Tool did not return a structured object.", "\u5DE5\u5177\u672A\u8FD4\u56DE\u7ED3\u6784\u5316\u5BF9\u8C61\u3002");
  if (name === "create_study" && (typeof result.structuredContent.study_id !== "string" || !result.structuredContent.study_id.trim())) fail("PROTOCOL", "Creation response has no study ID. Check heari studies list before retrying; the study may already exist.", "\u521B\u5EFA\u54CD\u5E94\u7F3A\u5C11\u7814\u7A76 ID\u3002\u7814\u7A76\u53EF\u80FD\u5DF2\u521B\u5EFA\uFF0C\u8BF7\u5148\u7528 heari studies list \u6838\u5BF9\uFF0C\u518D\u51B3\u5B9A\u662F\u5426\u91CD\u8BD5\u3002");
  validateToolResult(name, args, result.structuredContent);
  return result.structuredContent;
}
var uuid2 = (value) => typeof value === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
var sameId = (a, b) => uuid2(a) && uuid2(b) && String(a).toLowerCase() === String(b).toLowerCase();
function validateToolResult(name, args, result) {
  const invalid = () => fail("PROTOCOL", "Invalid operation response. No retry was made; check operation status before resubmitting.", "\u64CD\u4F5C\u54CD\u5E94\u4E0D\u5B8C\u6574\u6216\u65E0\u6548\uFF0C\u672A\u81EA\u52A8\u91CD\u8BD5\uFF1B\u518D\u6B21\u63D0\u4EA4\u524D\u8BF7\u6838\u5BF9\u64CD\u4F5C\u72B6\u6001\u3002");
  const integer = (value, minimum = 0) => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
  if (name === "list_interviews") {
    if (!uuid2(result.study_id) || !sameId(result.study_id, args.project_id) || !integer(result.total) || !Array.isArray(result.interviews)) invalid();
    const interviews = (
      /** @type {unknown[]} */
      result.interviews
    );
    if (interviews.some((item) => !isRecord(item) || !uuid2(item.id) || !sameId(item.study_id, args.project_id))) invalid();
    if (Number(result.total) < interviews.length || result.next_offset !== null && (!integer(result.next_offset, 1) || Number(result.next_offset) > Number(result.total) || !interviews.length || result.next_offset !== Number(args.offset ?? 0) + interviews.length)) invalid();
  }
  if (name === "get_interview" && (!uuid2(result.id) || !sameId(result.id, args.interview_id) || !uuid2(result.study_id) || !integer(result.interview_version, 1) || !isRecord(result.quality))) invalid();
  if (name === "get_interview_transcript") {
    if (!sameId(result.interview_id, args.interview_id) || !uuid2(result.interview_id) || !integer(result.interview_version, 1) || typeof result.available !== "boolean" || !Array.isArray(result.turns) || !integer(result.total)) invalid();
    const turns = (
      /** @type {unknown[]} */
      result.turns
    );
    if (result.available === false) {
      if (turns.length || result.total !== 0 || result.next_offset !== null || !["CONSENT_REQUIRED", "CONSENT_WITHDRAWN", "INTERVIEW_CHANGED"].includes(String(result.reason))) invalid();
    } else {
      if (args.expected_version !== void 0 && result.interview_version !== args.expected_version) invalid();
      if (Number(result.total) < turns.length || turns.some((turn) => !isRecord(turn) || !uuid2(turn.id) || !integer(turn.sequence, 1) || typeof turn.text !== "string" || typeof turn.speaker !== "string")) invalid();
      if (result.next_offset !== null && (!integer(result.next_offset, 1) || Number(result.next_offset) > Number(result.total) || !turns.length || result.next_offset !== Number(args.offset ?? 0) + turns.length)) invalid();
    }
  }
  const fingerprint2 = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  if (name === "review_insight") {
    if (typeof result.reviewed !== "boolean" || result.reviewed !== (args.confirmed === true) || !fingerprint2(result.fingerprint) || !isRecord(result.insight) || !sameId(result.insight.id, args.insight_id) || !sameId(result.insight.project_id, args.project_id)) invalid();
  }
  if (name === "get_report") {
    if (!sameId(result.report_id, args.report_id) || typeof result.available !== "boolean") invalid();
    if (result.available === true && (!fingerprint2(result.fingerprint) || !isRecord(result.report) || !sameId(result.report.id, args.report_id))) invalid();
    if (result.available === false && (result.reason !== "SOURCE_INVALID" || result.report !== void 0)) invalid();
  }
  if (name === "edit_report") {
    if (typeof result.edited !== "boolean" || result.edited !== (args.confirmed === true) || !fingerprint2(result.fingerprint)) invalid();
    if (result.edited === true ? !isRecord(result.report) || !sameId(result.report.id, args.report_id) : !isRecord(result.before) || !isRecord(result.after) || !sameId(result.before.id, args.report_id) || !sameId(result.after.id, args.report_id)) invalid();
  }
  const analysis = name === "get_analysis_status" || name === "start_analysis" && args.confirmed === true;
  const exported = name === "get_report_export_status" || name === "export_report" && args.confirmed === true;
  if (analysis || exported) {
    const states = analysis ? analysisStates : exportStates;
    if (!uuid2(result.id) || typeof result.status !== "string" || !states.includes(result.status)) invalid();
    if (args.job_id !== void 0 && String(result.id).toLowerCase() !== String(args.job_id).toLowerCase()) invalid();
  }
  if (name === "start_analysis" && args.confirmed !== true && (result.started !== false || result.status !== "CONFIRMATION_REQUIRED")) invalid();
  if (name === "export_report" && args.confirmed !== true && (result.created !== false || !isRecord(result.preview))) invalid();
  if (name === "generate_report" && args.confirmed !== true && (result.created !== false || result.status !== "CONFIRMATION_REQUIRED")) invalid();
  if ((name === "generate_report" || name === "publish_report") && args.confirmed === true) {
    if (!uuid2(result.id) || typeof result.status !== "string" || !reportStates.includes(result.status)) invalid();
    if (args.report_id !== void 0 && String(result.id).toLowerCase() !== String(args.report_id).toLowerCase()) invalid();
  }
  if (name === "publish_study") {
    if (typeof result.published !== "boolean" || (args.confirmed === true ? result.published !== true || !uuid2(result.study_id) || !uuid2(result.protocol_id) : result.published !== false)) invalid();
  }
  if (name === "propose_study_guide_edit" || name === "apply_study_guide_edit") {
    if (typeof result.applied !== "boolean") invalid();
    if (name === "propose_study_guide_edit" && result.applied !== false) invalid();
    if (result.edit_proposal !== null && result.edit_proposal !== void 0) {
      if (!isRecord(result.edit_proposal) || typeof result.edit_proposal.id !== "string" || !result.edit_proposal.id.trim() || typeof result.chat_id !== "string" || !result.chat_id.trim()) invalid();
    }
  }
}

// src/transport/mcp.mjs
import { randomUUID } from "node:crypto";
async function rpc(credentials, method, params, fetcher = fetch, protocol, signal) {
  assertActive(signal);
  const budget = deadline(12e4);
  const requestSignal = signal ? AbortSignal.any([signal, budget.signal]) : budget.signal;
  try {
    const notification = method === "notifications/initialized";
    const id2 = notification ? void 0 : randomUUID();
    let response;
    try {
      response = await fetcher(endpoint(credentials.endpoint), {
        method: "POST",
        redirect: "error",
        signal: requestSignal,
        headers: { Authorization: `Bearer ${tokenValue(credentials.token)}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...protocol ? { "MCP-Protocol-Version": protocol } : {} },
        body: JSON.stringify({ jsonrpc: "2.0", id: id2, method, params })
      });
    } catch (error) {
      assertActive(signal);
      if (error instanceof CliError) throw error;
      fail("NETWORK", "Request failed or timed out. No retry was made; check studies list before repeating a creation.", "\u8BF7\u6C42\u5931\u8D25\u6216\u8D85\u65F6\uFF0C\u672A\u81EA\u52A8\u91CD\u8BD5\uFF1B\u518D\u6B21\u521B\u5EFA\u524D\u8BF7\u8FD0\u884C heari studies list \u6838\u5BF9\u7ED3\u679C\u3002");
    }
    assertActive(signal);
    if (!response.ok) {
      await response.body?.cancel().catch(() => {
      });
      const error = new CliError(response.status === 401 || response.status === 403 ? "AUTH" : "HTTP", `Server returned HTTP ${response.status}. Check access and server availability.`, `\u670D\u52A1\u7AEF\u8FD4\u56DE HTTP ${response.status}\uFF0C\u8BF7\u68C0\u67E5\u8BBF\u95EE\u6743\u9650\u548C\u670D\u52A1\u72B6\u6001\u3002`);
      error.http_status = response.status;
      throw error;
    }
    if (method === "initialize" && response.headers.has("Mcp-Session-Id")) {
      await response.body?.cancel().catch(() => {
      });
      fail("PROTOCOL", "Stateful MCP sessions are not supported by this CLI.", "\u6B64 CLI \u4E0D\u652F\u6301\u6709\u72B6\u6001 MCP \u4F1A\u8BDD\u3002");
    }
    if (notification) {
      await response.body?.cancel().catch(() => {
      });
      return {};
    }
    let body;
    try {
      body = await response.json();
    } catch (error) {
      assertActive(signal);
      if (budget.signal.aborted || error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name)) fail("NETWORK", "Response timed out. No retry was made; check operation status before retrying.", "\u8BFB\u53D6\u54CD\u5E94\u8D85\u65F6\uFF0C\u672A\u81EA\u52A8\u91CD\u8BD5\uFF1B\u91CD\u8BD5\u524D\u8BF7\u6838\u5BF9\u64CD\u4F5C\u72B6\u6001\u3002");
      fail("PROTOCOL", "Server did not return JSON. Check the MCP endpoint.", "\u670D\u52A1\u7AEF\u672A\u8FD4\u56DE JSON\uFF0C\u8BF7\u68C0\u67E5 MCP \u670D\u52A1\u5730\u5740\u3002");
    }
    assertActive(signal);
    if (!isRecord(body) || body.jsonrpc !== "2.0" || body.id !== id2) fail("PROTOCOL", "Invalid MCP response envelope.", "MCP \u54CD\u5E94\u683C\u5F0F\u65E0\u6548\u3002");
    if (body.error) {
      const error = new CliError("RPC", "MCP rejected the request. Check client/server compatibility.", "MCP \u62D2\u7EDD\u8BF7\u6C42\uFF0C\u8BF7\u68C0\u67E5\u5BA2\u6237\u7AEF\u4E0E\u670D\u52A1\u7AEF\u517C\u5BB9\u6027\u3002");
      if (isRecord(body.error) && typeof body.error.code === "number" && Number.isSafeInteger(body.error.code)) error.rpc_code = body.error.code;
      throw error;
    }
    if (!isRecord(body.result)) fail("PROTOCOL", "Missing or invalid MCP result object.", "MCP \u54CD\u5E94\u7F3A\u5C11\u6709\u6548\u7684\u7ED3\u679C\u5BF9\u8C61\u3002");
    return body.result;
  } finally {
    budget.dispose();
  }
}
async function initializeClient(credentials, fetcher, signal) {
  const initialized = await rpc(credentials, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "@heari/cli", version: VERSION } }, fetcher, void 0, signal);
  if (initialized.protocolVersion !== "2025-06-18") fail("PROTOCOL", "Unsupported protocol version.", "\u4E0D\u652F\u6301\u6B64\u534F\u8BAE\u7248\u672C\u3002");
  await rpc(credentials, "notifications/initialized", {}, fetcher, initialized.protocolVersion, signal);
  return initialized.protocolVersion;
}
async function callTool(credentials, name, args, fetcher = fetch) {
  const client = createMcpClient(credentials, fetcher);
  try {
    return await client.callTool(name, args);
  } finally {
    client.close();
  }
}
function createMcpClient(credentials, fetcher = fetch, parent) {
  let bound = { endpoint: endpoint(credentials.endpoint), token: tokenValue(credentials.token) };
  const controller = new AbortController();
  const signal = parent ? AbortSignal.any([parent, controller.signal]) : controller.signal;
  let ready;
  let failed;
  const active = () => {
    assertActive(signal);
    if (failed) throw failed;
    if (!bound) throw cancelledError();
  };
  const combine = (extra) => extra ? AbortSignal.any([signal, extra]) : signal;
  const initialize = async (extra) => {
    active();
    ready ??= initializeClient(
      /** @type {import('../types.js').Credentials} */
      bound,
      fetcher,
      combine(extra)
    );
    try {
      const protocol = await abortable(ready, combine(extra));
      active();
      assertActive(extra);
      return protocol;
    } catch (error) {
      failed = error;
      throw error;
    }
  };
  const request = async (method, params, extra) => {
    try {
      const protocol = await initialize(extra);
      return await rpc(
        /** @type {import('../types.js').Credentials} */
        bound,
        method,
        params,
        fetcher,
        protocol,
        combine(extra)
      );
    } catch (error) {
      failed = error;
      throw error;
    }
  };
  return {
    initialize,
    request,
    async callTool(name, args, extra) {
      try {
        return readToolResult(name, args, await request("tools/call", { name, arguments: args }, extra));
      } catch (error) {
        failed = error;
        throw error;
      }
    },
    close() {
      bound = void 0;
      ready = void 0;
      failed = void 0;
      controller.abort();
    }
  };
}
async function invokeTool(credentials, name, args, context, signal) {
  if (context.mcp) return context.mcp.callTool(name, args, signal);
  const client = createMcpClient(credentials, context.fetcher, context.signal);
  try {
    return await client.callTool(name, args, signal);
  } finally {
    client.close();
  }
}
async function invokeConfirmedWriteTool(credentials, name, args, context) {
  const result = await invokeTool(credentials, name, args, context);
  return (
    /** @type {import('../types.js').ConfirmedWriteResults[K]} */
    result
  );
}

// src/auth/credentials.mjs
import { join } from "node:path";
import { lstat, readFile as readFile2, mkdir, writeFile, rename, rm } from "node:fs/promises";
import { randomUUID as randomUUID2 } from "node:crypto";
async function loadCredentials(directory) {
  try {
    const file = join(directory, "credentials.json");
    const stat = await lstat(file);
    if (!stat.isFile() || process.platform !== "win32" && stat.mode & 63) fail("CONFIG", "Credential file must be private (chmod 600).", "\u51ED\u636E\u6587\u4EF6\u5FC5\u987B\u4EC5\u5F53\u524D\u7528\u6237\u53EF\u8BFB\u5199\uFF08chmod 600\uFF09\u3002");
    const saved = JSON.parse(await readFile2(file, "utf8"));
    return { ...saved, endpoint: endpoint(saved.endpoint), token: tokenValue(saved.token) };
  } catch (error) {
    if (error instanceof CliError) throw error;
    fail("AUTH", "No readable credentials. Run heari login --help or set HEARI_ENDPOINT and HEARI_TOKEN.", "\u672A\u627E\u5230\u53EF\u8BFB\u53D6\u7684\u51ED\u636E\u3002\u8FD0\u884C heari login --help \u67E5\u770B\u767B\u5F55\u6B65\u9AA4\uFF0C\u6216\u540C\u65F6\u8BBE\u7F6E HEARI_ENDPOINT \u4E0E HEARI_TOKEN\u3002");
  }
}
async function saveCredentials(directory, credentials) {
  await mkdir(directory, { recursive: true, mode: 448 });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || process.platform !== "win32" && stat.mode & 63) fail("CONFIG", "Credential directory must be private (chmod 700).", "\u51ED\u636E\u76EE\u5F55\u5FC5\u987B\u4EC5\u5F53\u524D\u7528\u6237\u53EF\u8BBF\u95EE\uFF08chmod 700\uFF09\u3002");
  const temporary = join(directory, `.credentials-${randomUUID2()}`);
  try {
    await writeFile(temporary, `${JSON.stringify(credentials)}
`, { mode: 384, flag: "wx" });
    await rename(temporary, join(directory, "credentials.json"));
  } finally {
    await rm(temporary, { force: true });
  }
}

// src/auth/refresh.mjs
import { createServer as createSocketServer } from "node:net";
import { realpath, lstat as lstat2 } from "node:fs/promises";
import { join as join2 } from "node:path";
import { createHash } from "node:crypto";

// src/auth/oauth-client.mjs
async function oauthRequest(url, options, fetcher = fetch) {
  const budget = deadline(3e4);
  try {
    let response;
    try {
      response = await fetcher(url, { ...options, redirect: "error", signal: options.signal ? AbortSignal.any([options.signal, budget.signal]) : budget.signal });
    } catch {
      fail("NETWORK", "Authorization request failed; sign in again. No retry was made.", "\u6388\u6743\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\uFF1B\u672A\u81EA\u52A8\u91CD\u8BD5\u3002");
    }
    if (!response.ok) fail("AUTH", "Authorization failed or expired. Run heari login --web again.", "\u6388\u6743\u5931\u8D25\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u8FD0\u884C heari login --web\u3002");
    let result;
    try {
      result = await response.json();
    } catch {
      fail("PROTOCOL", "Invalid authorization response.", "\u6388\u6743\u54CD\u5E94\u683C\u5F0F\u65E0\u6548\u3002");
    }
    if (!isRecord(result)) fail("PROTOCOL", "Invalid authorization response.", "\u6388\u6743\u54CD\u5E94\u683C\u5F0F\u65E0\u6548\u3002");
    return result;
  } finally {
    budget.dispose();
  }
}
function oauthUrl(value, server) {
  const url = endpoint(value);
  if (new URL(url).origin !== new URL(server).origin) fail("CONFIG", "Authorization endpoints must share the MCP server origin.", "\u6388\u6743\u5730\u5740\u5FC5\u987B\u4E0E MCP \u670D\u52A1\u540C\u6E90\u3002");
  return url;
}
function oauthCredentials(result, server, client, tokenEndpoint, previousRefresh) {
  if (
    /** @type {string | undefined} */
    result.token_type?.toLowerCase() !== "bearer" || (typeof result.expires_in !== "number" || !Number.isFinite(result.expires_in)) || result.expires_in <= 0
  ) fail("PROTOCOL", "Invalid authorization credentials.", "\u6388\u6743\u51ED\u636E\u683C\u5F0F\u65E0\u6548\u3002");
  return {
    endpoint: server,
    token: tokenValue(result.access_token),
    auth: "oauth",
    client_id: tokenValue(client),
    token_endpoint: oauthUrl(tokenEndpoint, server),
    refresh_token: tokenValue(result.refresh_token ?? previousRefresh),
    expires_at: Date.now() + result.expires_in * 1e3
  };
}

// src/auth/refresh.mjs
async function lockRefresh(directory, signal) {
  let canonical;
  try {
    canonical = await realpath(directory);
  } catch {
    fail("CONFIG", "Cannot lock OAuth credentials.", "\u65E0\u6CD5\u9501\u5B9A OAuth \u51ED\u636E\u3002");
  }
  if (process.platform === "win32") canonical = canonical.toLowerCase();
  const port = 49152 + createHash("sha256").update(canonical).digest().readUInt16BE(0) % 16384;
  for (let attempt = 0; attempt < 50; attempt++) {
    assertActive(signal);
    const listener = createSocketServer((socket) => socket.destroy());
    const acquired = await new Promise((resolve2, reject) => {
      listener.once("error", (error) => {
        if (
          /** @type {NodeJS.ErrnoException} */
          error.code === "EADDRINUSE"
        ) resolve2(false);
        else reject(error);
      });
      listener.listen({ host: "127.0.0.1", port, exclusive: true }, () => resolve2(true));
    }).catch(() => fail("CONFIG", "Cannot lock OAuth credentials.", "\u65E0\u6CD5\u9501\u5B9A OAuth \u51ED\u636E\u3002"));
    if (acquired) {
      const release = () => new Promise((resolve2) => listener.close(() => resolve2(void 0)));
      if (signal?.aborted) {
        await release();
        assertActive(signal);
      }
      return release;
    }
    await sleep(100, signal);
  }
  fail("AUTH", "Another process is refreshing credentials; retry later or sign in again.", "\u5176\u4ED6\u8FDB\u7A0B\u6B63\u5728\u5237\u65B0\u51ED\u636E\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u6216\u91CD\u65B0\u767B\u5F55\u3002");
}
async function refreshCredentials(credentials, directory, fetcher, signal) {
  if (credentials.auth !== "oauth" || (credentials.expires_at ?? 0) > Date.now() + 3e4) return credentials;
  try {
    const legacy = await lstat2(join2(directory, "credentials.refresh.lock"));
    if (Date.now() - legacy.mtimeMs < 15e4) fail("AUTH", "An older CLI may be refreshing credentials. Close older CLI commands and retry later or sign in again.", "\u65E7\u7248 CLI \u53EF\u80FD\u6B63\u5728\u5237\u65B0\u51ED\u636E\u3002\u8BF7\u5173\u95ED\u65E7\u7248\u547D\u4EE4\uFF0C\u7A0D\u540E\u91CD\u8BD5\u6216\u91CD\u65B0\u767B\u5F55\u3002");
  } catch (error) {
    if (
      /** @type {NodeJS.ErrnoException} */
      error.code !== "ENOENT"
    ) throw error;
  }
  const release = await lockRefresh(directory, signal);
  try {
    const saved = await loadCredentials(directory);
    if (saved.endpoint !== credentials.endpoint) fail("AUTH", "Credentials changed; retry the command.", "\u51ED\u636E\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u8FD0\u884C\u547D\u4EE4\u3002");
    if (saved.auth !== "oauth" || (saved.expires_at ?? 0) > Date.now() + 3e4) return saved;
    const result = await oauthRequest(oauthUrl(saved.token_endpoint, saved.endpoint), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: tokenValue(saved.client_id), refresh_token: tokenValue(saved.refresh_token), resource: saved.endpoint }).toString() }, fetcher);
    const refreshed = oauthCredentials(
      result,
      saved.endpoint,
      saved.client_id,
      /** @type {string} */
      saved.token_endpoint,
      saved.refresh_token
    );
    const current = await loadCredentials(directory);
    if (current.token !== saved.token) fail("AUTH", "Credentials changed during refresh; retry the command.", "\u5237\u65B0\u671F\u95F4\u51ED\u636E\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u8FD0\u884C\u547D\u4EE4\u3002");
    assertActive(signal);
    await saveCredentials(directory, refreshed);
    return refreshed;
  } finally {
    await release();
  }
}

// src/auth/oauth.mjs
import { createServer } from "node:http";
import { randomBytes, createHash as createHash2, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
function oauthCallbackPage(locale, status) {
  const heading = status === "denied" ? pick(locale, "\u4F60\u5DF2\u53D6\u6D88\u672C\u6B21\u6388\u6743", "Authorization cancelled") : pick(locale, "\u672C\u6B21\u6388\u6743\u672A\u5B8C\u6210", "Authorization could not be completed");
  const detail = pick(locale, "\u8BF7\u8FD4\u56DE\u7EC8\u7AEF\u67E5\u770B\u63D0\u793A\u3002\u5982\u9700\u91CD\u8BD5\uFF0C\u8BF7\u91CD\u65B0\u8FD0\u884C heari login --web\u3002", "Return to your terminal for details. To try again, run heari login --web.");
  const next = pick(locale, "\u8FD4\u56DE\u7EC8\u7AEF\u7EE7\u7EED", "Return to your terminal");
  const note = pick(locale, "\u4F60\u53EF\u4EE5\u5173\u95ED\u6B64\u9875\u9762\uFF0C\u518D\u4ECE\u7EC8\u7AEF\u91CD\u65B0\u53D1\u8D77\u6388\u6743\u3002", "You can close this page and start authorization again from your terminal.");
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} \xB7 heari</title>
<style>
:root{color-scheme:light;--primary:#004bff;--primary-soft:#eef3ff;--background:#ffffff;--canvas:#f7f9fc;--foreground:#182336;--muted-foreground:#5c6778;--border:#e5eaf1}
*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--foreground);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;line-height:22px}
main{min-height:100svh;display:grid;place-items:center;padding:24px}.card{width:100%;max-width:480px;background:var(--background);border:1px solid var(--border);border-radius:6px;padding:32px}.brand{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:32px}.wordmark{font-size:20px;line-height:28px;font-weight:600;color:var(--primary)}.brand span{font-size:12px;line-height:20px;color:var(--muted-foreground)}.status{display:grid;place-items:center;width:48px;height:48px;border-radius:6px;background:var(--primary-soft);color:var(--primary);margin-bottom:24px}.status svg{width:24px;height:24px}h1{font-size:20px;line-height:28px;font-weight:600;margin:0 0 12px}p{margin:0;color:var(--muted-foreground)}.next{display:flex;align-items:center;gap:12px;margin:24px 0;padding:16px;background:var(--canvas);border:1px solid var(--border);border-radius:6px;font-weight:600}.next svg{width:24px;height:24px;flex:none;color:var(--primary)}footer{border-top:1px solid var(--border);padding-top:20px;font-size:12px;line-height:20px;color:var(--muted-foreground)}@media(max-width:480px){main{padding:16px}.card{padding:24px}}
</style></head><body><main><section class="card" aria-labelledby="result-title"><header class="brand"><strong class="wordmark">heari</strong><span>CLI</span></header>
<div class="status" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v7m0 4h.01"/></svg></div>
<h1 id="result-title">${heading}</h1><p>${detail}</p><div class="next"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 8 3 3-3 3m6 1h4"/></svg><span>${next}</span></div><footer>${note}</footer></section></main></body></html>`;
}
async function browserLogin(server, context, stderr, locale, noBrowser, execution, finishLogin) {
  const fetcher = context.fetcher ?? fetch;
  const origin = new URL(server).origin;
  const metadata2 = await oauthRequest(`${origin}/.well-known/oauth-authorization-server`, {}, fetcher);
  if (execution && !/** @type {string[] | undefined} */
  metadata2.scopes_supported?.includes("research:execute")) fail("PROTOCOL", "The server does not support research execution authorization.", "\u670D\u52A1\u7AEF\u5C1A\u4E0D\u652F\u6301\u7814\u7A76\u6267\u884C\u6388\u6743\u3002");
  const issuer = oauthUrl(metadata2.issuer, server);
  const authorizationEndpoint = oauthUrl(metadata2.authorization_endpoint, server);
  const tokenEndpoint = oauthUrl(metadata2.token_endpoint, server);
  const registrationEndpoint = oauthUrl(metadata2.registration_endpoint, server);
  if (!/** @type {string[] | undefined} */
  metadata2.code_challenge_methods_supported?.includes("S256")) fail("PROTOCOL", "The server must support PKCE S256.", "\u670D\u52A1\u7AEF\u5FC5\u987B\u652F\u6301 PKCE S256\u3002");
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  let receive;
  let reject;
  let client;
  let accepted = false;
  const callback = new Promise((resolve2, failed) => {
    receive = resolve2;
    reject = failed;
  });
  callback.catch(() => {
  });
  const listener = createServer(async (request, response) => {
    const render = (status, httpStatus = 200) => response.writeHead(httpStatus, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    }).end(oauthCallbackPage(locale, status));
    const rejectWithPage = (error, status = "invalid") => {
      if (response.destroyed) {
        reject(error);
        return;
      }
      response.once("finish", () => reject(error));
      response.once("close", () => reject(error));
      const landing = new URL("/auth/cli/complete", origin);
      landing.searchParams.set("lang", locale);
      landing.searchParams.set("result", status === "denied" ? "denied" : "failed");
      response.writeHead(303, { Location: landing.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Length": "0" }).end();
    };
    let url;
    try {
      url = new URL(request.url || "/", "http://127.0.0.1");
    } catch {
      render("invalid", 400);
      return;
    }
    const supplied = Buffer.from(url.searchParams.get("state") || "");
    const expected = Buffer.from(state);
    if (request.method !== "GET" || url.pathname !== "/callback" || supplied.length !== expected.length || !timingSafeEqual(supplied, expected) || request.headers.host !== new URL(redirectUri).host) {
      render("invalid", 400);
      return;
    }
    if (accepted) {
      render("invalid", 409);
      return;
    }
    if (url.searchParams.has("error")) {
      rejectWithPage(new CliError("AUTH", "Authorization was denied.", "\u6388\u6743\u5DF2\u88AB\u62D2\u7EDD\u3002"), "denied");
      return;
    }
    if (url.searchParams.has("iss")) {
      let matches = false;
      try {
        matches = oauthUrl(url.searchParams.get("iss"), server) === issuer;
      } catch {
      }
      if (!matches) {
        rejectWithPage(new CliError("AUTH", "Authorization issuer does not match.", "\u6388\u6743\u7B7E\u53D1\u65B9\u4E0D\u5339\u914D\u3002"));
        return;
      }
    }
    const code = url.searchParams.get("code");
    if (!code) {
      rejectWithPage(new CliError("AUTH", "Authorization code is missing.", "\u7F3A\u5C11\u6388\u6743\u7801\u3002"));
      return;
    }
    accepted = true;
    clearTimeout(timer);
    try {
      const result = await oauthRequest(tokenEndpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: client, code, code_verifier: verifier, redirect_uri: redirectUri, resource: server }).toString() }, fetcher);
      const credentials = oauthCredentials(result, server, client, tokenEndpoint);
      await finishLogin(credentials);
      const landing = new URL("/auth/cli/complete", origin);
      landing.searchParams.set("lang", locale);
      if (response.destroyed) {
        receive(credentials);
        return;
      }
      response.once("finish", () => receive(credentials));
      response.once("close", () => receive(credentials));
      response.writeHead(303, { Location: landing.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Length": "0" }).end();
    } catch (error) {
      rejectWithPage(error);
    }
  });
  await new Promise((resolve2, failed) => {
    listener.once("error", failed);
    listener.listen(0, "127.0.0.1", () => resolve2(void 0));
  });
  const redirectUri = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */
  listener.address().port}/callback`;
  const timer = setTimeout(() => reject(new CliError("AUTH", "Browser authorization timed out. Sign in again.", "\u6D4F\u89C8\u5668\u6388\u6743\u8D85\u65F6\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u3002")), context.authorizationTimeoutMs ?? 3e5);
  try {
    const registered = await oauthRequest(registrationEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_name: "heari CLI", redirect_uris: [redirectUri], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], ...execution ? { scope: "research:read research:draft research:execute" } : {} }) }, fetcher);
    client = tokenValue(registered.client_id);
    const url = new URL(authorizationEndpoint);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: client,
      redirect_uri: redirectUri,
      state,
      code_challenge: createHash2("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      resource: server,
      scope: execution ? "research:read research:draft research:execute" : "research:read research:draft"
    }).toString();
    stderr.write(`${pick(locale, "\u8BF7\u5728\u6D4F\u89C8\u5668\u5B8C\u6210\u6CE8\u518C/\u767B\u5F55\u548C\u6388\u6743\uFF1B\u65B0\u5DE5\u4F5C\u7A7A\u95F4\u9700\u7B49\u5F85\u540E\u53F0\u5F00\u901A\u5957\u9910\u3002", "Complete registration/sign-in and authorization in your browser; new workspaces await plan activation.")}
${url.href}
`);
    if (!noBrowser) {
      if (context.openBrowser) await abortable(context.openBrowser(url.href), context.signal);
      else {
        const [program2, args] = process.platform === "darwin" ? ["open", [url.href]] : process.platform === "win32" ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url.href]] : ["xdg-open", [url.href]];
        await new Promise((resolve2) => execFile(program2, args, { timeout: 1e4, signal: context.signal }, () => resolve2(void 0)));
      }
    }
    return await abortable(callback, context.signal);
  } finally {
    clearTimeout(timer);
    listener.closeAllConnections();
    await new Promise((resolve2) => listener.close(resolve2));
  }
}

// src/auth/session.mjs
async function readToken(input, signal) {
  if (input.isTTY) fail("USAGE", "Pipe the token to stdin. Run heari login --help for a hidden-input example.", "\u8BF7\u901A\u8FC7\u7BA1\u9053\u8F93\u5165\u4EE4\u724C\u3002\u8FD0\u884C heari login --help \u67E5\u770B\u4E0D\u56DE\u663E\u4EE4\u724C\u7684\u8F93\u5165\u793A\u4F8B\u3002");
  assertActive(signal);
  const cancel = () => input.destroy?.();
  signal?.addEventListener("abort", cancel, { once: true });
  let value = "";
  try {
    for await (const chunk of input) {
      value += chunk.toString();
      if (value.length > 4096) fail("AUTH", "Token input is too long.", "\u4EE4\u724C\u8F93\u5165\u8FC7\u957F\u3002");
    }
    assertActive(signal);
    return tokenValue(value);
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}
function usesBrowserLogin(values, env, context) {
  if (context.aeCredentials) return false;
  return Boolean(values.web || values["no-browser"] || !values["token-stdin"] && !env.HEARI_TOKEN && (context.stdin ?? process.stdin).isTTY && !values["no-input"]);
}
async function standaloneAuthenticate(command, env, directory, context, stderr, locale, browserAuth) {
  let credentials;
  if (command.name === "login") {
    const loginEndpoint = endpoint(command.values.endpoint || env.HEARI_ENDPOINT || DEFAULT_ENDPOINT);
    if (new URL(loginEndpoint).pathname === "/") {
      const suggested = new URL("/mcp", loginEndpoint).href;
      fail("CONFIG", `Use the MCP endpoint instead of the website root: --endpoint ${suggested}`, `\u8BF7\u4F7F\u7528 MCP \u670D\u52A1\u5730\u5740\u800C\u975E\u7F51\u7AD9\u6839\u5730\u5740\uFF1A--endpoint ${suggested}`);
    }
    if (browserAuth) {
      credentials = await browserLogin(endpoint(loginEndpoint), context, stderr, locale, command.values["no-browser"], command.values.execute, (credentials2) => verifyAndSave(credentials2, directory, context.fetcher, context.signal));
    } else {
      const token = command.values["token-stdin"] ? await readToken(context.stdin ?? process.stdin, context.signal) : tokenValue(env.HEARI_TOKEN);
      credentials = { endpoint: endpoint(loginEndpoint), token };
    }
  } else if (env.HEARI_ENDPOINT || env.HEARI_TOKEN) {
    if (!env.HEARI_ENDPOINT || !env.HEARI_TOKEN) fail("CONFIG", "Set HEARI_ENDPOINT and HEARI_TOKEN together to avoid sending saved credentials to another host.", "\u5FC5\u987B\u540C\u65F6\u8BBE\u7F6E HEARI_ENDPOINT \u4E0E HEARI_TOKEN\uFF0C\u907F\u514D\u5C06\u5DF2\u4FDD\u5B58\u51ED\u636E\u53D1\u9001\u5230\u5176\u4ED6\u4E3B\u673A\u3002");
    credentials = { endpoint: endpoint(env.HEARI_ENDPOINT), token: tokenValue(env.HEARI_TOKEN) };
  } else credentials = await refreshCredentials(await loadCredentials(directory), directory, context.fetcher, context.signal);
  return credentials;
}
async function verifyAndSave(credentials, directory, fetcher, signal) {
  await callTool(credentials, "list_projects", {}, fetcher);
  assertActive(signal);
  if (!credentials.aeSession) await saveCredentials(directory, credentials);
}
async function currentAeCredentials(expectedEndpoint, context) {
  function checkEndpoint(registeredEndpoint) {
    if (!expectedEndpoint) return;
    const url = new URL(endpoint(expectedEndpoint));
    if (url.pathname === "/") url.pathname = "/mcp";
    if (url.href !== registeredEndpoint) fail("CONFIG", "HearI endpoint does not match the current AE registration.", "\u6307\u5B9A\u7684 HearI \u5730\u5740\u4E0E\u5F53\u524D AE \u73AF\u5883\u7684\u7ED1\u5B9A\u4E0D\u4E00\u81F4\u3002");
  }
  let credentials;
  try {
    credentials = await context.aeCredentials(context.signal, checkEndpoint);
  } catch (error) {
    if (error instanceof CliError && error.code === "CONFIG") throw error;
    if (error?.aeDiagnostic) throw Object.assign(new CliError("AUTH", error.message), { aeDiagnostic: error.aeDiagnostic, http_status: error.aeDiagnostic.http_status });
    fail("AUTH", "Could not use the current AE login. Check AE credentials, HearI registration and workspace membership.");
  }
  if (credentials) {
    checkEndpoint(credentials.endpoint);
    return { ...credentials, aeSession: true };
  }
}
function prefersAeLogin(values, env, context) {
  return context.aeCredentials && !env.HEARI_TOKEN && !values.web && !values.execute && !values["token-stdin"];
}
async function authenticate(command, env, directory, context, stderr, locale, browserAuth) {
  if (command.name === "login" && (env.HEARI_TOKEN || command.values["token-stdin"]) && !command.values.endpoint && !env.HEARI_ENDPOINT) {
    fail("CONFIG", "An independent token requires its explicit HearI MCP endpoint.");
  }
  const aeLogin = command.name === "login" && prefersAeLogin(command.values, env, context);
  if (context.aeCredentials && (aeLogin || command.name !== "login") && !env.HEARI_TOKEN) {
    const credentials = await currentAeCredentials(command.values.endpoint || env.HEARI_ENDPOINT, context);
    if (credentials) return credentials;
  }
  if (aeLogin) fail("AUTH", "Sign in to the current AE with ae-cli auth login, then retry.");
  return standaloneAuthenticate(command, env, directory, context, stderr, locale, browserAuth);
}

// src/commands/skills.mjs
function installSkills() {
  fail("USAGE", "Use ae-cli install to install the matching Agent Skills.");
}

// src/commands/update.mjs
function updateCli() {
  fail("USAGE", "Use ae-cli update to update the bundled HearI CLI.");
}

// src/commands/doctor.mjs
import { lstat as lstat3 } from "node:fs/promises";
var commands = catalogue();
async function standaloneDoctor(values, env, directory, context, locale) {
  const started = performance.now();
  const checks = [];
  const add = (check, status, code, zh, en, fix) => checks.push({ check, status, code, message: pick(locale, zh, en), ...fix ? { fix } : {} });
  add("runtime", Number(process.versions.node.split(".")[0]) >= 22 ? "PASS" : "FAIL", "NODE_VERSION", "\u9700\u8981 Node.js 22 \u6216\u66F4\u9AD8\u7248\u672C\u3002", "Node.js 22 or newer is required.", Number(process.versions.node.split(".")[0]) >= 22 ? void 0 : pick(locale, "\u5B89\u88C5 Node.js 22 \u6216\u66F4\u9AD8\u7248\u672C\u3002", "Install Node.js 22+"));
  add("cli", "PASS", "CLI_VERSION", "\u5DF2\u8BFB\u53D6\u5F53\u524D CLI \u7248\u672C\uFF1B\u672A\u68C0\u67E5 npm \u6700\u65B0\u7248\u672C\u3002", "Current CLI version loaded; npm latest was not checked.");
  let credentials;
  if (env.HEARI_ENDPOINT || env.HEARI_TOKEN) {
    if (!env.HEARI_ENDPOINT || !env.HEARI_TOKEN) {
      add("credentials", "FAIL", "ENV_PAIR_REQUIRED", "HEARI_ENDPOINT \u4E0E HEARI_TOKEN \u5FC5\u987B\u540C\u65F6\u8BBE\u7F6E\uFF1B\u672A\u8BFB\u53D6\u672C\u673A\u51ED\u636E\u3002", "Set HEARI_ENDPOINT and HEARI_TOKEN together; saved credentials were not read.", "heari login --help");
    } else {
      try {
        credentials = { endpoint: endpoint(env.HEARI_ENDPOINT), token: tokenValue(env.HEARI_TOKEN) };
        add("credentials", "PASS", "ENV_CREDENTIALS", "\u73AF\u5883\u51ED\u636E\u683C\u5F0F\u6709\u6548\uFF0C\u5C1A\u672A\u9A8C\u8BC1\u767B\u5F55\u3002", "Environment credentials are well formed; authentication is not yet verified.");
      } catch {
        add("credentials", "FAIL", "ENV_INVALID", "\u73AF\u5883\u670D\u52A1\u5730\u5740\u6216\u4EE4\u724C\u683C\u5F0F\u65E0\u6548\uFF1B\u503C\u5DF2\u9690\u85CF\u3002", "Invalid environment endpoint or token format; values are hidden.", "heari login --help");
      }
    }
    add("configuration", "SKIP", "ENV_OVERRIDE", "\u4F7F\u7528\u73AF\u5883\u51ED\u636E\uFF0C\u672A\u68C0\u67E5\u5DF2\u4FDD\u5B58\u7684\u914D\u7F6E\u3002", "Using environment credentials; saved configuration was not inspected.");
  } else {
    try {
      const info = await lstat3(directory);
      if (!info.isDirectory() || process.platform !== "win32" && info.mode & 63) {
        add("configuration", "FAIL", "CONFIG_PERMISSIONS", "\u914D\u7F6E\u76EE\u5F55\u4E0D\u662F\u666E\u901A\u76EE\u5F55\u6216\u6743\u9650\u8FC7\u5BBD\u3002", "Configuration path is not a directory or its permissions are too broad.", pick(locale, "\u68C0\u67E5\u914D\u7F6E\u76EE\u5F55\uFF1BPOSIX \u6743\u9650\u5E94\u4EC5\u5F53\u524D\u7528\u6237\u53EF\u8BBF\u95EE\uFF08700\uFF09\u3002", "Inspect the config directory; POSIX permissions must be private (700)."));
      } else {
        add("configuration", process.platform === "win32" ? "WARN" : "PASS", process.platform === "win32" ? "ACL_NOT_VERIFIED" : "CONFIG_PRIVATE", process.platform === "win32" ? "\u914D\u7F6E\u76EE\u5F55\u6709\u6548\uFF1B\u672A\u9A8C\u8BC1 Windows ACL\u3002" : "\u914D\u7F6E\u76EE\u5F55\u6709\u6548\u4E14\u6743\u9650\u79C1\u6709\u3002", process.platform === "win32" ? "Configuration directory is valid; Windows ACLs are not verified." : "Configuration directory is valid and private.");
        credentials = await loadCredentials(directory);
        add("credentials", "PASS", "SAVED_CREDENTIALS", "\u5DF2\u8BFB\u53D6\u79C1\u6709\u51ED\u636E\uFF0C\u5C1A\u672A\u9A8C\u8BC1\u767B\u5F55\u3002", "Saved credentials loaded; authentication is not yet verified.");
      }
    } catch (error) {
      const missing = (
        /** @type {NodeJS.ErrnoException} */
        error.code === "ENOENT"
      );
      const permission = error instanceof CliError && error.code === "CONFIG";
      add("credentials", "FAIL", missing ? "CONFIG_MISSING" : permission ? "CREDENTIAL_PERMISSIONS" : "CREDENTIALS_UNREADABLE", "\u672A\u627E\u5230\u53EF\u5B89\u5168\u8BFB\u53D6\u7684\u672C\u673A\u51ED\u636E\uFF1B\u672A\u521B\u5EFA\u6216\u4FEE\u6539\u6587\u4EF6\u3002", "No safely readable saved credentials; no files were created or changed.", permission ? pick(locale, "\u68C0\u67E5\u51ED\u636E\u6587\u4EF6\u6743\u9650\uFF08600\uFF09\u548C\u914D\u7F6E\u76EE\u5F55\u6743\u9650\uFF08700\uFF09\u3002", "Inspect credential file (600) and config directory (700) permissions.") : "heari login");
    }
  }
  if (credentials) {
    if (new URL(credentials.endpoint).pathname === "/") {
      add("endpoint", "FAIL", "WEBSITE_ROOT", "\u670D\u52A1\u5730\u5740\u6307\u5411\u7F51\u7AD9\u9996\u9875\uFF0C\u8BF7\u4F7F\u7528\u5B8C\u6574 MCP \u8DEF\u5F84\u3002", "Endpoint points to a website root; use the full MCP path.", "heari login --endpoint https://YOUR_HOST/mcp");
      credentials = void 0;
    } else add("endpoint", "PASS", "ENDPOINT_VALID", "\u670D\u52A1\u5730\u5740\u683C\u5F0F\u6709\u6548\uFF1B\u672A\u663E\u793A\u5730\u5740\u3002", "Endpoint is well formed; its value is hidden.");
  }
  const configured = Boolean(credentials);
  const authMethod = credentials ? credentials.auth === "oauth" ? "oauth" : "token" : null;
  if (credentials?.auth === "oauth" && (!Number.isFinite(credentials.expires_at) || (credentials.expires_at ?? 0) <= (context.now ?? Date.now)() + 3e4)) {
    add("expiry", "FAIL", "OAUTH_EXPIRED", "OAuth \u767B\u5F55\u5DF2\u8FC7\u671F\u3001\u5373\u5C06\u8FC7\u671F\u6216\u5230\u671F\u4FE1\u606F\u65E0\u6548\uFF1B\u8BCA\u65AD\u4E0D\u4F1A\u5237\u65B0\u4EE4\u724C\u3002", "OAuth credentials are expired, near expiry or have invalid expiry metadata; doctor does not refresh tokens.", "heari login --web");
    credentials = void 0;
  }
  if (!values.online || !credentials) {
    add("connection", "SKIP", values.online ? "CREDENTIALS_REQUIRED" : "ONLINE_NOT_REQUESTED", "\u672A\u6267\u884C\u8054\u7F51\u68C0\u67E5\u3002", "Online checks were not performed.", values.online ? "heari login" : "heari doctor --online");
    add("authentication", "SKIP", "NOT_VERIFIED", "\u5C1A\u672A\u9A8C\u8BC1\u670D\u52A1\u7AEF\u8EAB\u4EFD\u3001\u89D2\u8272\u6216\u989D\u5EA6\u3002", "Server authentication, roles and credits have not been verified.");
    add("tools", "SKIP", "NOT_VERIFIED", "\u5C1A\u672A\u68C0\u67E5\u670D\u52A1\u7AEF\u5DE5\u5177\u76EE\u5F55\u3002", "Server tool catalogue has not been checked.");
  } else {
    const budget = deadline(1e4);
    const signal = budget.signal;
    const fetcher = (
      /** @type {typeof fetch} */
      ((url, options) => (context.fetcher ?? fetch)(url, { ...options, signal: options?.signal ? AbortSignal.any([options.signal, signal]) : signal }))
    );
    const client = createMcpClient(credentials, fetcher, context.signal);
    let connected = false;
    let catalogueRead = false;
    try {
      await client.initialize();
      connected = true;
      add("connection", "PASS", "MCP_CONNECTED", "\u5DF2\u8FDE\u63A5\u670D\u52A1\u5E76\u5B8C\u6210 MCP \u534F\u8BAE\u63E1\u624B\u3002", "Connected to the service and completed MCP negotiation.");
      const catalogue2 = await client.request("tools/list", {});
      if (!Array.isArray(catalogue2.tools) || catalogue2.tools.some((tool) => !isRecord(tool) || typeof tool.name !== "string") || new Set(catalogue2.tools.map((tool) => tool.name)).size !== catalogue2.tools.length) throw new CliError("PROTOCOL", "Invalid tool catalogue");
      catalogueRead = true;
      const names = new Set(catalogue2.tools.map((tool) => tool.name));
      const expected = /* @__PURE__ */ new Set([...Object.values(commands).flatMap((spec) => spec.tool ? [spec.tool] : []), "prepare_research", "get_research_contact", "request_research_contact"]);
      const missing = [...expected].filter((name) => !names.has(name));
      add("tools", missing.length ? "WARN" : "PASS", missing.length ? "TOOLS_INCOMPLETE" : "TOOL_NAMES_AVAILABLE", missing.length ? `\u76EE\u5F55\u7F3A\u5C11 ${missing.length} \u4E2A CLI \u5DE5\u5177\uFF1B\u53EF\u80FD\u53D7\u7248\u672C\u6216\u53EF\u89C1\u8303\u56F4\u9650\u5236\u3002` : "CLI \u4F7F\u7528\u7684\u5DE5\u5177\u540D\u79F0\u5747\u53EF\u89C1\uFF1B\u672A\u8BC1\u660E\u5B8C\u6574 schema \u517C\u5BB9\u3002", missing.length ? `${missing.length} CLI tools are absent; version or visibility may differ.` : "CLI tool names are visible; full schema compatibility is not established.", missing.length ? "heari tools --no-input" : void 0);
      if (!names.has("list_projects")) {
        add("authentication", "FAIL", "READ_TOOL_UNAVAILABLE", "\u7F3A\u5C11\u53EA\u8BFB\u9A8C\u8BC1\u5DE5\u5177\uFF0C\u65E0\u6CD5\u9A8C\u8BC1\u767B\u5F55\u3002", "The read verification tool is unavailable; authentication could not be verified.", "heari tools --no-input");
      } else {
        const result = await client.callTool("list_projects", {});
        if (!Array.isArray(result.projects)) throw new CliError("PROTOCOL", "Invalid read verification result");
        add("authentication", "PASS", "READ_VERIFIED", "\u53EA\u8BFB\u8BBF\u95EE\u6210\u529F\uFF1B\u4E0D\u4EE3\u8868\u5177\u5907\u8349\u7A3F\u3001\u6267\u884C\u6743\u9650\u6216\u989D\u5EA6\u3002", "Read access verified; draft/execute access and credits are not established.");
      }
    } catch (error) {
      const code = error instanceof CliError ? error.tool_code ?? error.code : "LOCAL";
      add(!connected ? "connection" : !catalogueRead ? "tools" : "authentication", "FAIL", code, "\u8054\u7F51\u8BCA\u65AD\u5931\u8D25\uFF1B\u672A\u8F93\u51FA\u8FDC\u7AEF\u6B63\u6587\u6216\u51ED\u636E\u3002", "Online diagnostic failed; remote bodies and credentials are suppressed.", ["AUTH", "IDENTITY_REQUIRED"].includes(code) ? "heari login" : code === "ROLE_FORBIDDEN" ? pick(locale, "\u8BF7\u5DE5\u4F5C\u533A\u7BA1\u7406\u5458\u6838\u5BF9\u5F53\u524D\u6210\u5458\u7684\u53EA\u8BFB\u8BBF\u95EE\u6743\u9650\u3002", "Ask a workspace administrator to verify this member\u2019s read access.") : code === "RATE_LIMITED" ? pick(locale, "\u7A0D\u540E\u518D\u8FD0\u884C heari doctor --online\uFF0C\u907F\u514D\u53CD\u590D\u8BF7\u6C42\u3002", "Wait before running heari doctor --online again; avoid repeated requests.") : code === "NETWORK" ? pick(locale, "\u68C0\u67E5\u7F51\u7EDC\u3001VPN\u53CAMCP\u670D\u52A1\u5730\u5740\uFF0C\u518D\u8FD0\u884C heari doctor --online\u3002", "Check network, VPN and MCP endpoint, then run heari doctor --online.") : code === "PROTOCOL" ? pick(locale, "\u6838\u5BF9\u5B8C\u6574MCP\u8DEF\u5F84\u548C\u670D\u52A1\u7AEF\u7248\u672C\uFF0C\u518D\u8FD0\u884C heari tools --no-input\u3002", "Verify the full MCP path and server version, then run heari tools --no-input.") : "heari tools --no-input");
      const failure = checks.at(-1);
      if (failure && error instanceof CliError && error.http_status) failure.http_status = error.http_status;
      if (!connected) add("tools", "SKIP", "CONNECTION_FAILED", "\u8FDE\u63A5\u5931\u8D25\uFF0C\u672A\u68C0\u67E5\u5DE5\u5177\u76EE\u5F55\u3002", "Tool catalogue was not checked because connection failed.");
      if (!catalogueRead) add("authentication", "SKIP", "NOT_VERIFIED", "\u672A\u9A8C\u8BC1\u53EA\u8BFB\u8BBF\u95EE\u3002", "Read access was not verified.");
    } finally {
      client.close();
      budget.dispose();
    }
  }
  return { passed: !checks.some((check) => check.status === "FAIL"), online: Boolean(values.online), cli_version: VERSION, node_version: process.versions.node, elapsed_ms: Math.round(performance.now() - started), configured, usable_locally: Boolean(credentials), credential_source: env.HEARI_ENDPOINT || env.HEARI_TOKEN ? "environment" : "file", auth_method: authMethod, checks };
}
async function authStatus(values, env, directory, context, locale) {
  const report = await doctor(values, env, directory, context, locale);
  const verified = report.checks.some((check) => check.code === "READ_VERIFIED");
  const rejected = report.checks.some((check) => check.status === "FAIL" && (check.http_status === 401 || check.code === "IDENTITY_REQUIRED"));
  const denied = report.checks.some((check) => check.status === "FAIL" && (check.code === "AUTH" || ["TOKEN_READ_ONLY", "ROLE_FORBIDDEN", "EXECUTION_SCOPE_REQUIRED"].includes(check.code)));
  return { ...report, authenticated: verified ? true : rejected ? false : null, read_access: verified ? true : rejected || denied ? false : null, verification: verified ? "read_verified" : rejected ? "rejected" : denied ? "access_denied" : "not_verified" };
}
async function doctor(values, env, directory, context, locale) {
  const local2 = () => standaloneDoctor(values, env, directory, context, locale);
  if (!context.aeCredentials || env.HEARI_TOKEN) return local2();
  if (!values.online) {
    const report2 = await local2();
    const check = report2.checks.find((item) => item.check === "credentials");
    if (check && (check.code === "CONFIG_MISSING" || check.code === "CREDENTIALS_UNREADABLE")) {
      check.message += pick(locale, " \u79BB\u7EBF\u8BCA\u65AD\u5C1A\u672A\u9A8C\u8BC1 AE \u514D\u767B\u3002", " AE sign-in has not been verified offline.");
      check.fix = "ae-cli heari auth status --online";
    }
    return report2;
  }
  let credentials;
  try {
    credentials = await currentAeCredentials(env.HEARI_ENDPOINT, context);
  } catch (error) {
    const baseline = await standaloneDoctor({ ...values, online: false }, {}, directory, context, locale);
    return {
      ...baseline,
      passed: false,
      online: true,
      configured: false,
      usable_locally: false,
      credential_source: "ae",
      auth_method: "ae",
      checks: [
        ...baseline.checks.filter((check) => ["runtime", "cli"].includes(check.check)),
        { check: "authentication", status: "FAIL", code: error.code, message: error.message, ...error.aeDiagnostic }
      ]
    };
  }
  if (!credentials) return local2();
  const report = await standaloneDoctor(values, {
    ...env,
    HEARI_ENDPOINT: credentials.endpoint,
    HEARI_TOKEN: credentials.token
  }, directory, context, locale);
  return {
    ...report,
    credential_source: "ae",
    auth_method: "ae",
    endpoint: credentials.endpoint,
    checks: report.checks.filter((check) => !["configuration", "credentials"].includes(check.check))
  };
}

// src/command/contract.mjs
function commandContract(values, locale) {
  const commands2 = catalogue(locale);
  const root = createProgram(locale);
  const registered = root.createHelp().visibleOptions(root);
  const optionsFor = (names) => Object.fromEntries(Object.keys(names).map((name) => [name, describeOption(
    /** @type {import('commander').Option} */
    registered.find((option) => option.name() === name)
  )]));
  const requested = typeof values.command === "string" ? values.command : void 0;
  if (requested !== void 0 && !Object.hasOwn(commands2, requested)) fail("USAGE", "Unknown command for schema. Run heari --help.", "schema \u6307\u5B9A\u7684\u547D\u4EE4\u4E0D\u5B58\u5728\uFF0C\u8BF7\u8FD0\u884C heari --help\u3002");
  const local2 = (value) => Array.isArray(value) ? pick(locale, ...value) : value ?? "";
  const describeOptions = (options) => Object.fromEntries(Object.entries(options).map(([name, option]) => [name, {
    type: option.multiple ? "array" : option.type,
    ...option.multiple ? { items: { type: "string" } } : {},
    description: local2(option.description),
    ...option.short ? { short: option.short } : {},
    ...option.valueName ? { value_name: option.valueName } : {},
    ...name === "lang" ? { enum: ["zh-CN", "en-US"], default: "zh-CN" } : {},
    ...name === "format" ? { enum: ["json", "text", "table"], default: "json" } : {}
  }]));
  return {
    schema_version: 1,
    cli_version: VERSION,
    locale,
    scope: "client-invocation",
    defaults: { format: "json", lang: "zh-CN", automatic_retry: false },
    output_controls: { default_is_complete: true, select_path_syntax: "slash-path-with-~0-~1-escaping-and-array-wildcard", explicit_controls_wrap_result: ["select", "max-items"], wrapper: { result: "data", metadata: "output" }, no_automatic_text_truncation: true, compact_is_whitespace_only: true },
    streams: { result: "stdout", error: "stderr", diagnostic_report: "stdout" },
    exit_codes: { "0": "command-completed-check-business-result", "1": "service-auth-or-local-failure", "2": "usage-error" },
    error_result: { stream: "stderr", mode: "--no-input", schema: errorResultSchema, examples: [{ error: { code: "USAGE", message: pick(locale, "\u53C2\u6570\u65E0\u6548\u3002", "Invalid arguments.") } }], excludes: ["help", "version", "terminal-login-notice"], output_failure_may_prevent_delivery: true },
    automation: { flags: ["--no-input", "--format", "json"], does_not_grant_consent: true, does_not_establish_server_permissions: true },
    global_options: describeOptions(optionsFor(globalOptions)),
    root_options: describeOptions(optionsFor(rootOptions)),
    commands: Object.entries(commands2).filter(([name]) => !requested || name === requested).map(([name, spec]) => {
      if (!spec.policy) fail("LOCAL", "Missing command invocation policy.", "\u547D\u4EE4\u7F3A\u5C11\u8C03\u7528\u7B56\u7565\u3002");
      const policy = spec.policy;
      const result = resultContract(name, locale);
      return {
        ...result ? { result } : {},
        name,
        description: local2(spec.description),
        authentication: policy.authentication,
        ...spec.tool ? { tool: spec.tool } : {},
        positionals: spec.id ? [{ name: spec.idName ?? "study-id", type: "string", required: true, value_name: "UUID" }] : [],
        options: describeOptions(spec.options ?? {}),
        required_flags: spec.required ?? [],
        effects: policy.effects,
        confirmation: policy.confirmation,
        ...policy.confirmation.startsWith("confirm-flag") ? { confirmation_flag: "confirm", default_executes_mutation: false } : {},
        retry: { automatic: false, strategy: policy.retry, key_flags: policy.key_flags ?? [] },
        constraints: (spec.constraints ?? []).map(({ message: _message, ...rule }) => rule),
        notes: (spec.notes ?? []).map(local2),
        examples: spec.examples.map(local2)
      };
    })
  };
}

// src/io/report-download.mjs
import { resolve } from "node:path";
import { lstat as lstat4, open, rm as rm2 } from "node:fs/promises";
import { createHash as createHash3 } from "node:crypto";
async function downloadReport(credentials, args, output, fetcher = fetch, client, signal) {
  const target = resolve(output);
  try {
    await lstat4(target);
    fail("USAGE", "Output file already exists; choose a new path.", "\u76EE\u6807\u6587\u4EF6\u5DF2\u5B58\u5728\uFF0C\u8BF7\u4F7F\u7528\u65B0\u8DEF\u5F84\u3002");
  } catch (error) {
    if (
      /** @type {NodeJS.ErrnoException} */
      error.code !== "ENOENT"
    ) throw error;
  }
  const grant = (
    /** @type {{download_path: string, download_token: string, artifact_sha256: string, artifact_size_bytes: number}} */
    await (client ? client.callTool("get_report_download", args) : callTool(credentials, "get_report_download", args, fetcher))
  );
  const url = new URL(grant.download_path, new URL(credentials.endpoint).origin);
  if (url.origin !== new URL(credentials.endpoint).origin || url.pathname !== "/api/backend/public/report-export-downloads" || url.search || url.hash) fail("PROTOCOL", "Unsafe report download address.", "\u62A5\u544A\u4E0B\u8F7D\u5730\u5740\u4E0D\u5B89\u5168\u3002");
  const expected = grant.artifact_sha256;
  if (!/^[a-f0-9]{64}$/.test(expected ?? "") || !Number.isSafeInteger(grant.artifact_size_bytes) || grant.artifact_size_bytes < 0 || grant.artifact_size_bytes > 64 * 1024 * 1024) fail("PROTOCOL", "Invalid export size or checksum.", "\u5BFC\u51FA\u5927\u5C0F\u6216\u6821\u9A8C\u503C\u65E0\u6548\u3002");
  const budget = deadline(12e4);
  try {
    let response;
    try {
      response = await fetcher(endpoint(url.href), { method: "POST", redirect: "error", signal: signal ? AbortSignal.any([signal, budget.signal]) : budget.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tokenValue(grant.download_token) }) });
    } catch {
      fail("NETWORK", "Report download failed; no retry was made.", "\u62A5\u544A\u4E0B\u8F7D\u5931\u8D25\uFF0C\u672A\u81EA\u52A8\u91CD\u8BD5\u3002");
    }
    if (!response.ok) fail("HTTP", "Report download was rejected or expired.", "\u62A5\u544A\u4E0B\u8F7D\u88AB\u62D2\u7EDD\u6216\u5DF2\u8FC7\u671F\u3002");
    const chunks = [];
    let size = 0;
    for await (
      const chunk of
      /** @type {NonNullable<Response['body']>} */
      response.body
    ) {
      size += chunk.byteLength;
      if (size > grant.artifact_size_bytes || size > 64 * 1024 * 1024) fail("PROTOCOL", "Report download exceeds the declared size.", "\u4E0B\u8F7D\u6587\u4EF6\u8D85\u8FC7\u58F0\u660E\u5927\u5C0F\u3002");
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks);
    if (size !== grant.artifact_size_bytes || createHash3("sha256").update(content).digest("hex") !== expected) fail("PROTOCOL", "Report checksum verification failed.", "\u62A5\u544A\u5B8C\u6574\u6027\u6821\u9A8C\u5931\u8D25\u3002");
    assertActive(signal);
    const file = await open(target, "wx", 384);
    try {
      assertActive(signal);
      await file.writeFile(content);
    } catch (error) {
      await file.close();
      await rm2(target, { force: true });
      throw error;
    }
    await file.close();
    return { downloaded: true, output: target, bytes: size, sha256: expected };
  } finally {
    budget.dispose();
  }
}

// src/commands/research.mjs
import { createHash as createHash4 } from "node:crypto";
import { constants } from "node:fs";
import { readFile as readFile3, lstat as lstat5, open as open2 } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
async function research2(values, credentials, context, stderr, locale) {
  const t = (zh, en) => pick(locale, zh, en);
  let saved = values["brief-file"] ? await readReviewedBrief(String(values["brief-file"])) : void 0;
  const name = values.name === void 0 ? void 0 : String(values.name).trim();
  if (saved && name !== void 0) saved = sealBrief({ ...saved.input, name });
  const answers = saved ? saved.input.answers : values["answers-file"] ? await readAnswers(values["answers-file"]) : [];
  const stdin = context.stdin ?? process.stdin;
  const interactive = !values["no-input"] && values.format !== "json" && (context.interactive ?? Boolean(stdin.isTTY && stderr.isTTY && (context.stdout ?? process.stdout).isTTY));
  let terminal;
  const ask = context.ask ?? (async (prompt) => {
    terminal ??= createInterface({ input: stdin, output: (
      /** @type {NodeJS.WritableStream} */
      stderr
    ) });
    try {
      return await terminal.question(prompt, { signal: context.signal });
    } catch {
      fail("USAGE", "Input ended; the study has not been submitted.", "\u8F93\u5165\u5DF2\u7ED3\u675F\uFF0C\u7814\u7A76\u5C1A\u672A\u63D0\u4EA4\u3002");
    }
  });
  try {
    let draft = saved ? { ...saved.input, questions: [], engine: "reviewed-input", status: "READY_FOR_REVIEW" } : void 0;
    while (!saved) {
      draft = await invokeTool(credentials, "prepare_research", { brief: values.goal, answers }, context);
      if (name !== void 0) draft.name = name;
      if (!Array.isArray(draft.questions)) fail("PROTOCOL", "Missing research clarification questions.", "\u670D\u52A1\u7AEF\u54CD\u5E94\u7F3A\u5C11\u7814\u7A76\u6F84\u6E05\u95EE\u9898\u3002");
      if (draft.questions.some((question2) => !isRecord(question2) || typeof question2.question !== "string" || !question2.question.trim() || question2.options !== void 0 && (!Array.isArray(question2.options) || question2.options.some((option) => typeof option !== "string")))) fail("PROTOCOL", "Invalid research clarification questions.", "\u670D\u52A1\u7AEF\u8FD4\u56DE\u7684\u7814\u7A76\u6F84\u6E05\u95EE\u9898\u683C\u5F0F\u65E0\u6548\u3002");
      if (!draft.questions.length || !interactive || answers.length >= 20) break;
      const question = (
        /** @type {import('../types.js').Clarification} */
        draft.questions[0]
      );
      stderr.write(`${question.question}
${(question.options ?? []).map((option, i) => `  ${i + 1}. ${option}`).join("\n")}
`);
      const input = (await abortable(ask(t("\u56DE\u7B54\uFF08\u8F93\u5165\u9009\u9879\u7F16\u53F7\u6216\u5177\u4F53\u8BF4\u660E\uFF0C\u7A7A\u884C\u9000\u51FA\uFF09\uFF1A", "Answer (option number or details; blank to cancel): ")), context.signal)).trim();
      if (!input) return { status: "CANCELLED", created: false };
      const index = /^\d+$/.test(input) ? Number(input) - 1 : -1;
      const answer = question.options?.[index] ?? input;
      answers.push({ question: question.question, answer });
    }
    if (!draft || !Array.isArray(draft.questions)) fail("PROTOCOL", "Missing research clarification questions.", "\u670D\u52A1\u7AEF\u54CD\u5E94\u7F3A\u5C11\u7814\u7A76\u6F84\u6E05\u95EE\u9898\u3002");
    if (draft.questions.length) return { ...draft, answers, created: false, next_step: t("\u8BF7\u5411\u7814\u7A76\u5458\u63D0\u51FA\u8FD4\u56DE\u7684\u6F84\u6E05\u95EE\u9898\uFF0C\u7B49\u5F85\u5B9E\u9645\u56DE\u7B54\uFF1B\u4E0D\u8981\u4EE3\u7B54\u3001\u7F16\u9020\u7EBF\u7D22\u6216\u81EA\u884C\u9009\u62E9\u9009\u9879\u3002\u5C06\u5168\u90E8\u7D2F\u8BA1 question/answer \u4FDD\u5B58\u4E3A JSON\uFF0C\u7528 --answers-file \u7EE7\u7EED\u3002\u5F53\u524D\u4E0D\u662F\u5C31\u7EEA\u7B80\u62A5\uFF0C\u5C1A\u672A\u521B\u5EFA\u7814\u7A76\u3002", "Ask the researcher the returned clarification questions and wait for their actual answers. Do not fill in facts, invent evidence or choose options for them. Save the complete accumulated question/answer array as JSON and continue with --answers-file. This is not a ready brief; no study has been created.") };
    if (["name", "decision_question", "target_population"].some((key) => typeof draft[key] !== "string" || !draft[key].trim())) fail("PROTOCOL", "Incomplete research brief; no creation was attempted.", "\u7814\u7A76\u7B80\u62A5\u4E0D\u5B8C\u6574\uFF0C\u672A\u5C1D\u8BD5\u521B\u5EFA\u7814\u7A76\u3002");
    const confirmation = saved ?? sealBrief({ name: draft.name, decision_question: draft.decision_question, brief: values.goal, target_population: draft.target_population, answers: answers.map(({ question, answer }) => ({ question, answer })) });
    let confirmed = values.confirm;
    if (interactive && !confirmed) {
      stderr.write(`
${t("\u7814\u7A76\u540D\u79F0", "Study name")}: ${draft.name}
${t("\u51B3\u7B56\u95EE\u9898", "Decision question")}: ${draft.decision_question}
${t("\u76EE\u6807\u4EBA\u7FA4", "Target population")}: ${draft.target_population}
${t("\u6765\u6E90", "Source")}: ${draft.engine}
${draft.note ?? ""}
`);
      confirmed = /^(y|yes|是|确认)$/i.test((await abortable(ask(t("\u786E\u8BA4\u4EE5\u4E0A\u7B80\u62A5\u5E76\u751F\u6210\u65B9\u6848\u8349\u7A3F\uFF1F[y/N] ", "Confirm this brief and create a draft? [y/N] ")), context.signal)).trim());
    }
    if (!confirmed) return {
      ...draft,
      answers,
      created: false,
      confirmation,
      ...saved ? { source_preview_verified: true } : {},
      next_step: saved ? t("\u5DF2\u8BFB\u53D6\u5E76\u9A8C\u8BC1\u8F93\u5165\u7684\u5C31\u7EEA\u9884\u89C8\u6587\u4EF6\uFF0C\u539F\u6587\u4EF6\u672A\u88AB\u6539\u5199\uFF1B\u65E0\u9700\u518D\u6B21\u4FDD\u5B58\u6216\u91CD\u65B0\u751F\u6210\u3002\u7528\u6237\u5DF2\u6388\u6743\u521B\u5EFA\u65F6\uFF0C\u5BF9\u540C\u4E00\u5B9E\u9645\u8DEF\u5F84\u52A0 --confirm\uFF0C\u5E76\u4FDD\u7559\u660E\u786E\u6307\u5B9A\u7684 --name\uFF08\u82E5\u6709\uFF09\u3002--name \u7684\u66F4\u540D\u7ED3\u679C\u4EC5\u5728\u672C\u6B21\u8F93\u51FA\u4E2D\uFF0C\u4E0D\u4EE3\u8868\u539F\u6587\u4EF6\u5DF2\u66F4\u540D\u3002", "The supplied ready preview file was read and verified without modifying it. No further save or regeneration is needed. When creation is authorized, use --confirm with the same actual path and the explicitly requested --name, if any. A --name change applies to this output; it does not rename the original file.") : t("\u672C\u547D\u4EE4\u4EC5\u8F93\u51FA JSON\uFF0C\u4E0D\u521B\u5EFA\u9884\u89C8\u6587\u4EF6\u3002\u5C55\u793A\u5E76\u5BA1\u9605\u5B9E\u9645\u7B80\u62A5\uFF0C\u4F7F\u7528\u6587\u4EF6\u5DE5\u5177\u5C06\u5B8C\u6574 JSON \u539F\u6837\u5199\u5165\u65B0\u7684\u4E34\u65F6\u6587\u4EF6\uFF0C\u7B49\u5F85\u5199\u5165\u6210\u529F\uFF0C\u518D\u7528 heari research --brief-file \u5B9E\u9645\u8DEF\u5F84 --no-input \u79BB\u7EBF\u6821\u9A8C\uFF1B\u6210\u529F\u524D\u4E0D\u5F97\u58F0\u79F0\u6587\u4EF6\u5DF2\u4FDD\u5B58\u3002\u83B7\u51C6\u521B\u5EFA\u540E\uFF0C\u5BF9\u540C\u4E00\u8DEF\u5F84\u52A0 --confirm\uFF1B\u7528\u6237\u660E\u786E\u66F4\u540D\u65F6\u52A0 --name\u3002\u4E0D\u8981\u91CD\u5EFA JSON\u3001\u731C\u8DEF\u5F84\u6216\u91CD\u65B0\u751F\u6210\u7B80\u62A5\u3002", "Review the brief in this actual JSON result. This command does not create a preview file. Use a file tool to save the complete JSON unchanged to a new temporary file, wait for write success, then validate it offline with heari research --brief-file ACTUAL_PATH --no-input. Do not claim the file is saved before successful write and validation. When creation is authorized, add --confirm to that same path; add --name for an explicit name change. Do not reconstruct JSON, guess paths or regenerate the brief.")
    };
    const created = await invokeTool(credentials, "create_study", confirmation.input, context);
    return { ...created, created: true, next_step: t(`\u5148\u7528 heari guide show ${created.study_id} \u67E5\u770B\u63D0\u7EB2\uFF0C\u518D\u7528 heari guide edit ${created.study_id} --message "\u4F60\u7684\u4FEE\u6539\u8981\u6C42" \u63D0\u51FA\u7F16\u8F91\u5EFA\u8BAE\uFF1B\u5BA1\u9605\u540E\u7528 guide apply \u786E\u8BA4\u4FDD\u5B58\u3002\u4E5F\u53EF\u6253\u5F00\u8FD4\u56DE\u7684\u7814\u7A76\u94FE\u63A5\u5728\u7F51\u9875\u7F16\u8F91\u3002\u9700\u8981\u56E2\u961F\u534F\u52A9\u65F6\uFF0C\u53EF\u9009\u7528 heari contact ${created.study_id} --email YOUR_EMAIL \u9884\u89C8\u8054\u7CFB\u7533\u8BF7\u3002`, `Use heari guide show ${created.study_id} to review the guide, then heari guide edit ${created.study_id} --message "Your requested changes" to propose edits. Review the proposal before confirming with guide apply. You can also edit through the returned study link. Team contact is optional: heari contact ${created.study_id} --email YOUR_EMAIL.`) };
  } finally {
    terminal?.close();
  }
}
async function readAnswers(path) {
  let answers;
  try {
    const info = await lstat5(path);
    if (!info.isFile() || info.size > 65536) fail("USAGE", "Answers must be a JSON file no larger than 64 KiB.", "\u56DE\u7B54\u5FC5\u987B\u662F JSON \u6587\u4EF6\u4E14\u4E0D\u8D85\u8FC7 64 KiB\u3002");
    answers = JSON.parse(await readFile3(path, "utf8"));
  } catch (error) {
    if (error instanceof CliError) throw error;
    fail("USAGE", "Cannot read answers JSON file.", "\u65E0\u6CD5\u8BFB\u53D6\u56DE\u7B54 JSON \u6587\u4EF6\u3002");
  }
  if (!Array.isArray(answers) || answers.length > 20 || answers.some((item) => !item || typeof item.question !== "string" || typeof item.answer !== "string")) fail("USAGE", "Answers must be an array of at most 20 {question, answer} objects.", "\u56DE\u7B54\u5FC5\u987B\u662F\u7531 {question, answer} \u5BF9\u8C61\u7EC4\u6210\u7684\u6570\u7EC4\uFF0C\u6700\u591A 20 \u6761\u3002");
  return answers;
}
function sealBrief(input) {
  const canonical = {
    name: input.name,
    decision_question: input.decision_question,
    brief: input.brief,
    target_population: input.target_population,
    answers: (
      /** @type {import('../types.js').Answer[]} */
      input.answers.map(({ question, answer }) => ({ question, answer }))
    )
  };
  return { schema_version: 1, input_sha256: createHash4("sha256").update(JSON.stringify(canonical)).digest("hex"), input: canonical };
}
async function readReviewedBrief(path) {
  const invalid = () => fail("USAGE", "Use an unchanged, ready research preview JSON file (regular file, at most 128 KiB).", "\u8BF7\u4F7F\u7528\u672A\u6539\u52A8\u4E14\u5DF2\u5B8C\u6210\u6F84\u6E05\u7684\u7814\u7A76\u9884\u89C8 JSON\uFF08\u666E\u901A\u6587\u4EF6\uFF0C\u6700\u5927128 KiB\uFF09\u3002");
  let file;
  let value;
  try {
    if (!(await lstat5(path)).isFile()) invalid();
    file = await open2(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 131072) invalid();
    const buffer = Buffer.alloc(131073);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > 131072) invalid();
    value = JSON.parse(buffer.subarray(0, length).toString("utf8"));
  } catch (error) {
    if (error instanceof CliError) throw error;
    invalid();
  } finally {
    await file?.close();
  }
  if (!isRecord(value) || value.created !== false || !isRecord(value.confirmation)) invalid();
  const receipt = value.confirmation;
  if (receipt.schema_version !== 1 || typeof receipt.input_sha256 !== "string" || !isRecord(receipt.input)) invalid();
  const input = receipt.input;
  if (!Array.isArray(value.questions) || value.questions.length || ["name", "decision_question", "target_population"].some((key) => value[key] !== input[key])) invalid();
  const fields = ["name", "decision_question", "brief", "target_population", "answers"];
  if (Object.keys(input).length !== fields.length || Object.keys(input).some((key) => !fields.includes(key))) invalid();
  if (fields.slice(0, 4).some((key) => typeof input[key] !== "string" || !String(input[key]).trim())) invalid();
  if (!Array.isArray(input.answers) || input.answers.length > 20 || input.answers.some((item) => !isRecord(item) || Object.keys(item).length !== 2 || typeof item.question !== "string" || typeof item.answer !== "string")) invalid();
  const reviewedAnswers = (
    /** @type {import('../types.js').Answer[]} */
    input.answers
  );
  if (value.status !== void 0 && value.status !== "READY_FOR_REVIEW") invalid();
  if (!Array.isArray(value.answers) || value.answers.length !== reviewedAnswers.length || value.answers.some((answer, index) => !isRecord(answer) || answer.question !== reviewedAnswers[index].question || answer.answer !== reviewedAnswers[index].answer)) invalid();
  const sealed = sealBrief(input);
  if (sealed.input_sha256 !== receipt.input_sha256) invalid();
  return (
    /** @type {Awaited<ReturnType<typeof readReviewedBrief>>} */
    sealed
  );
}

// src/commands/contact.mjs
async function contact(command, credentials, context, locale) {
  const t = (zh, en) => pick(locale, zh, en);
  let result;
  if (command.values.confirm) {
    result = await invokeTool(credentials, "request_research_contact", { ...command.args, email: command.values.email, confirmed: true }, context);
  } else {
    result = await invokeTool(credentials, "get_research_contact", command.args, context);
    if (command.values.email && result.status === "NOT_SUBMITTED") result = {
      ...result,
      callback_email: command.values.email,
      note: t("\u5C1A\u672A\u63D0\u4EA4\u3002\u786E\u8BA4\u5141\u8BB8\u56E2\u961F\u901A\u8FC7\u6B64\u90AE\u7BB1\u8054\u7CFB\u4F60\u540E\uFF0C\u52A0 --confirm \u518D\u8FD0\u884C\u3002\u4E0D\u4F1A\u53D1\u5E03\u7814\u7A76\u6216\u9080\u8BF7\u53D7\u8BBF\u8005\u3002", "Not submitted. Add --confirm only after consenting to contact at this email. This does not publish a study or invite participants.")
    };
  }
  return result;
}

// src/commands/guide.mjs
import { randomUUID as randomUUID3 } from "node:crypto";
async function guide(command, credentials, context, locale) {
  if (command.name === "guide edit" || command.name === "guide apply") command.args.locale = locale;
  if (command.name === "guide edit" && !command.args.turn_id) command.args.turn_id = randomUUID3();
  const result = await invokeTool(
    credentials,
    /** @type {string} */
    command.tool,
    command.args,
    context
  );
  return command.name === "guide edit" ? { ...result, turn_id: command.args.turn_id } : result;
}

// src/commands/dispatch.mjs
async function tools(_command, credentials, context) {
  const client = context.mcp ?? createMcpClient(credentials, context.fetcher, context.signal);
  const result = await client.request("tools/list", {});
  if (!Array.isArray(result.tools)) fail("PROTOCOL", "Server did not return a tool catalogue.", "\u670D\u52A1\u7AEF\u672A\u8FD4\u56DE\u5DE5\u5177\u76EE\u5F55\u3002");
  return result;
}
function registerWorkflows(register) {
  register("research", (command, credentials, context, stderr, locale) => research2(command.values, credentials, context, stderr, locale));
  register("contact", (command, credentials, context, _stderr, locale) => contact(command, credentials, context, locale));
  for (const name of ["guide show", "guide edit", "guide apply"]) register(name, (command, credentials, context, _stderr, locale) => guide(command, credentials, context, locale));
  register("reports download", (command, credentials, context) => downloadReport(
    credentials,
    command.args,
    /** @type {string} */
    command.values.output,
    context.fetcher,
    context.mcp,
    context.signal
  ));
  register("tools", tools);
  register("analysis status", waitForJob);
  register("reports export-status", waitForJob);
}
async function execute(command, credentials, context, stderr, locale, handler) {
  const client = createMcpClient(credentials, context.fetcher, context.signal);
  try {
    const scoped = { ...context, mcp: client };
    if (handler) return await handler(command, credentials, scoped, stderr, locale);
    if (command.args.confirmed === true) {
      switch (command.tool) {
        case "publish_study":
        case "start_analysis":
        case "generate_report":
          return await invokeConfirmedWriteTool(
            credentials,
            command.tool,
            /** @type {import('../types.js').ConfirmedWriteArguments['publish_study']} */
            command.args,
            scoped
          );
        case "publish_report":
          return await invokeConfirmedWriteTool(
            credentials,
            command.tool,
            /** @type {import('../types.js').ConfirmedWriteArguments['publish_report']} */
            command.args,
            scoped
          );
        case "export_report":
          return await invokeConfirmedWriteTool(
            credentials,
            command.tool,
            /** @type {import('../types.js').ConfirmedWriteArguments['export_report']} */
            command.args,
            scoped
          );
      }
    }
    return await client.callTool(
      /** @type {string} */
      command.tool,
      command.args
    );
  } finally {
    client.close();
  }
}
async function waitForJob(command, credentials, context, _stderr, locale) {
  if (!command.values.wait) return invokeTool(
    credentials,
    /** @type {string} */
    command.tool,
    command.args,
    context
  );
  const now = context.now ?? (() => performance.now());
  const budget = deadline(Number(command.values["timeout-ms"] ?? 3e5));
  const signal = context.signal ? AbortSignal.any([context.signal, budget.signal]) : budget.signal;
  const sleep2 = (milliseconds) => context.sleep ? abortable(context.sleep(milliseconds), signal) : sleep(milliseconds, signal);
  const deadline2 = now() + Number(command.values["timeout-ms"] ?? 3e5);
  const analysis = command.name === "analysis status";
  const success = analysis ? "SUCCEEDED" : "READY";
  const failed = analysis ? ["DEAD_LETTER", "CANCELLED"] : ["DEAD_LETTER", "EXPIRED", "REVOKED", "EXPIRING"];
  let status;
  const failure = (code, en, zh) => {
    const error = new CliError(code, en, zh);
    const id2 = command.args.job_id;
    if (typeof id2 === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id2)) error.job_id = id2;
    error.status = status;
    error.locale = locale;
    return error;
  };
  try {
    while (true) {
      assertActive(context.signal);
      const remaining = deadline2 - now();
      if (remaining <= 0) throw failure("WAIT_TIMEOUT", "Wait budget exhausted. Query the same job again; no job was restarted.", "\u7B49\u5F85\u9884\u7B97\u5DF2\u7528\u5C3D\uFF0C\u8BF7\u7EE7\u7EED\u67E5\u8BE2\u540C\u4E00\u4EFB\u52A1\uFF1B\u672A\u91CD\u65B0\u542F\u52A8\u4EFB\u52A1\u3002");
      let result;
      try {
        result = await invokeTool(
          credentials,
          /** @type {string} */
          command.tool,
          command.args,
          context,
          signal
        );
      } catch (error) {
        assertActive(context.signal);
        if (signal.aborted || now() >= deadline2) throw failure("WAIT_TIMEOUT", "Wait budget exhausted. Query the same job again; no job was restarted.", "\u7B49\u5F85\u9884\u7B97\u5DF2\u7528\u5C3D\uFF0C\u8BF7\u7EE7\u7EED\u67E5\u8BE2\u540C\u4E00\u4EFB\u52A1\uFF1B\u672A\u91CD\u65B0\u542F\u52A8\u4EFB\u52A1\u3002");
        if (error instanceof CliError && typeof command.args.job_id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(command.args.job_id)) error.job_id = command.args.job_id;
        throw error;
      }
      status = /** @type {string} */
      result.status;
      if (status === success) return result;
      if (failed.includes(status)) throw failure("JOB_FAILED", "Job is failed or unavailable. Inspect its status; no automatic restart was made.", "\u4EFB\u52A1\u5931\u8D25\u6216\u5DF2\u4E0D\u53EF\u7528\uFF0C\u8BF7\u6838\u5BF9\u72B6\u6001\uFF1B\u672A\u81EA\u52A8\u91CD\u542F\u3002");
      if (now() >= deadline2) throw failure("WAIT_TIMEOUT", "Wait budget exhausted. Query the same job again; no job was restarted.", "\u7B49\u5F85\u9884\u7B97\u5DF2\u7528\u5C3D\uFF0C\u8BF7\u7EE7\u7EED\u67E5\u8BE2\u540C\u4E00\u4EFB\u52A1\uFF1B\u672A\u91CD\u65B0\u542F\u52A8\u4EFB\u52A1\u3002");
      try {
        await sleep2(Math.min(1500, deadline2 - now()));
      } catch (error) {
        assertActive(context.signal);
        if (budget.signal.aborted || now() >= deadline2) throw failure("WAIT_TIMEOUT", "Wait budget exhausted. Query the same job again; no job was restarted.", "\u7B49\u5F85\u9884\u7B97\u5DF2\u7528\u5C3D\uFF0C\u8BF7\u7EE7\u7EED\u67E5\u8BE2\u540C\u4E00\u4EFB\u52A1\uFF1B\u672A\u91CD\u65B0\u542F\u52A8\u4EFB\u52A1\u3002");
        throw error;
      }
    }
  } finally {
    budget.dispose();
  }
}

// src/io/output.mjs
import { Writable } from "node:stream";

// src/io/table.mjs
var segments = new Intl.Segmenter(void 0, { granularity: "grapheme" });
function clean(value) {
  return value.replace(/\t/g, "  ").replace(
    /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}
function width(value) {
  let count2 = 0;
  for (const { segment } of segments.segment(value)) {
    count2 += /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff01-\uff60\uffe0-\uffe6]/u.test(segment) ? 2 : [...segment].filter((character) => !new RegExp("\\p{Mark}", "u").test(character)).length;
  }
  return count2;
}
function wrap(value, limit) {
  const lines = [];
  for (const line of clean(value).split("\n")) {
    let current = "", used = 0;
    for (const { segment } of segments.segment(line)) {
      const size = width(segment);
      if (used + size > limit && current) {
        lines.push(current);
        current = "";
        used = 0;
      }
      current += segment;
      used += size;
    }
    lines.push(current);
  }
  return lines;
}
function scalar(value) {
  return value === void 0 ? "\u2014" : value === null ? "null" : String(value);
}
function renderTable(result, locale, columns = 100) {
  const limit = Math.max(40, Math.min(160, Number.isFinite(columns) ? columns : 100));
  const lines = [pick(locale, "\u7ED3\u679C", "Result")];
  const labels = {
    status: ["\u72B6\u6001", "Status"],
    total: ["\u603B\u6570", "Total"],
    created: ["\u5DF2\u521B\u5EFA", "Created"],
    name: ["\u540D\u79F0", "Name"],
    study_id: ["\u7814\u7A76 ID", "Study ID"],
    job_id: ["\u4EFB\u52A1 ID", "Job ID"],
    report_id: ["\u62A5\u544A ID", "Report ID"],
    next_step: ["\u4E0B\u4E00\u6B65", "Next step"],
    warnings: ["\u63D0\u793A", "Warnings"],
    edit_proposal: ["\u4FEE\u6539\u5EFA\u8BAE", "Edit proposal"],
    before: ["\u4FEE\u6539\u524D", "Before"],
    after: ["\u4FEE\u6539\u540E", "After"]
  };
  const label = (key) => Object.hasOwn(labels, key) ? pick(locale, ...labels[key]) : clean(key);
  const append = (value, depth) => {
    const indent = "  ".repeat(Math.min(depth, 8));
    lines.push(...wrap(value, Math.max(20, limit - indent.length)).map((line) => indent + line));
  };
  function table(items, depth) {
    if (!items.length || !items.every((item) => isRecord(item) && Object.values(item).every((value) => value === null || typeof value !== "object"))) return false;
    const records = (
      /** @type {Record<string, unknown>[]} */
      items
    );
    const keys = [...new Set(records.flatMap((item) => Object.keys(item)))];
    const available = limit - Math.min(depth, 8) * 2;
    if (!keys.length || keys.length * 10 + 1 > available) return false;
    const cellWidth = Math.floor((available - 1) / keys.length) - 3;
    const row = (values) => {
      const cells = values.map((value) => wrap(value, cellWidth));
      for (let i = 0; i < Math.max(...cells.map((cell) => cell.length)); i++) {
        lines.push("  ".repeat(Math.min(depth, 8)) + "| " + cells.map((cell) => {
          const value = cell[i] ?? "";
          return value + " ".repeat(Math.max(0, cellWidth - width(value)));
        }).join(" | ") + " |");
      }
    };
    row(keys.map(label));
    lines.push("  ".repeat(Math.min(depth, 8)) + "|" + keys.map(() => "-".repeat(cellWidth + 2)).join("|") + "|");
    for (const record of records) row(keys.map((key) => scalar(Object.hasOwn(record, key) ? record[key] : void 0)));
    return true;
  }
  function visit(value, depth) {
    if (Array.isArray(value)) {
      if (!value.length) {
        append("[]", depth);
        return;
      }
      if (table(value, depth)) return;
      value.forEach((item, index) => {
        if (item !== null && typeof item === "object") {
          append(`[${index + 1}]`, depth);
          visit(item, depth + 1);
        } else append(`- ${scalar(item)}`, depth);
      });
    } else if (isRecord(value)) {
      if (!Object.keys(value).length) append("{}", depth);
      for (const [key, item] of Object.entries(value)) {
        if (item !== null && typeof item === "object") {
          append(`${label(key)}:`, depth);
          visit(item, depth + 1);
        } else append(`${label(key)}: ${scalar(item)}`, depth);
      }
    } else append(scalar(value), depth);
  }
  visit(result, 0);
  return lines.join("\n") + "\n";
}

// src/io/output.mjs
var OutputWriteError = class extends CliError {
  /** @param {unknown} cause @param {'stdout'|'stderr'} stream */
  constructor(cause, stream) {
    super("OUTPUT", "Output could not be written. The operation may have completed; inspect its state before retrying.", "\u7ED3\u679C\u5199\u51FA\u5931\u8D25\u3002\u64CD\u4F5C\u53EF\u80FD\u5DF2\u7ECF\u5B8C\u6210\uFF0C\u8BF7\u5148\u6838\u5BF9\u72B6\u6001\u518D\u51B3\u5B9A\u662F\u5426\u91CD\u8BD5\u3002");
    this.stream = stream;
    this.pipeClosed = cause !== null && typeof cause === "object" && "code" in cause && (cause.code === "EPIPE" || cause.code === "ENOTCONN");
  }
};
async function writeText(stream, text, channel = "stdout") {
  if (!(stream instanceof Writable)) {
    try {
      stream.write(text);
    } catch (error) {
      throw new OutputWriteError(error, channel);
    }
    return;
  }
  if (stream.destroyed) throw new OutputWriteError(stream.errored, channel);
  await new Promise((resolve2, reject) => {
    const onError = (error) => reject(new OutputWriteError(error, channel));
    stream.once("error", onError);
    try {
      stream.write(text, (error) => {
        if (error) {
          reject(new OutputWriteError(error, channel));
          return;
        }
        stream.removeListener("error", onError);
        resolve2(void 0);
      });
    } catch (error) {
      stream.removeListener("error", onError);
      reject(new OutputWriteError(error, channel));
    }
  });
}
function watchOutput(stdout, stderr, cancel) {
  let failure;
  const cleanup = [];
  for (
    const [stream, channel] of
    /** @type {const} */
    [[stdout, "stdout"], [stderr, "stderr"]]
  ) {
    if (!(stream instanceof Writable)) continue;
    const listener = (error) => {
      failure ??= new OutputWriteError(error, channel);
      cancel();
    };
    stream.on("error", listener);
    cleanup.push(() => stream.removeListener("error", listener));
  }
  return { get failure() {
    return failure;
  }, close() {
    for (const remove of cleanup) remove();
  } };
}
async function writeResult(result, values, stdout, locale = "zh-CN") {
  result = projectResult(result, values);
  if (values.format === "table") {
    await writeText(stdout, renderTable(result, locale, stdout.columns));
    return;
  }
  const output = values.format === "text" && !values.compact ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  await writeText(stdout, `${output}
`);
}
async function writeFailure(error, { command, locale, browserAuth, secret, stdout, stderr }) {
  const t = (zh, en) => pick(locale, zh, en);
  const code = error instanceof CliError ? error.code : "LOCAL";
  let message = error instanceof CliError ? pick(error.locale ?? locale, error.chinese, error.message) : t("\u672C\u5730\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u914D\u7F6E\u76EE\u5F55\u6743\u9650\u3002", "Local operation failed. Check configuration directory permissions.");
  if (code === "NETWORK" && command?.name?.startsWith("guide ")) message = t("\u8BF7\u6C42\u5931\u8D25\u6216\u8D85\u65F6\uFF0C\u672A\u81EA\u52A8\u91CD\u8BD5\u3002\u8BF7\u5148\u7528 heari guide show \u6838\u5BF9\u5F53\u524D\u63D0\u7EB2\uFF1B\u4FEE\u6539\u5EFA\u8BAE\u53EF\u4F7F\u7528\u76F8\u540C turn_id \u6838\u5BF9\u91CD\u8BD5\u3002", "The request failed or timed out without retrying. Check the current guide with heari guide show first; reuse the same turn_id for a checked proposal retry.");
  const trialNotice = false;
  if (trialNotice) message = t("\u8FD8\u6CA1\u8D26\u53F7\uFF1F\u8BD5\u7528\u8BF7\u8054\u7CFB hello@email.heari.ai", "No account yet? For a trial, contact hello@email.heari.ai");
  if (secret) message = message.replaceAll(secret, "[REDACTED]");
  const jobId = error instanceof CliError && error.job_id ? error.job_id : ["CANCELLED", "OUTPUT"].includes(code) && typeof command?.args?.job_id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(command.args.job_id) ? command.args.job_id : void 0;
  const detail = { code, message, ...error?.aeDiagnostic, ...error instanceof OutputWriteError ? { output_stream: error.stream, operation_may_have_completed: true } : {}, ...error instanceof CliError && error.operation_may_have_completed ? { operation_may_have_completed: true } : {}, ...error instanceof CliError && error.tool_code ? { tool_code: error.tool_code } : {}, ...jobId ? { job_id: jobId, ...error instanceof CliError && error.status ? { status: error.status } : {} } : {}, ...error instanceof CliError && error.rpc_code !== void 0 ? { rpc_code: error.rpc_code } : {}, ...error instanceof CliError && error.http_status ? { http_status: error.http_status } : {}, ...command?.name === "guide edit" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
    /** @type {string} */
    command.args?.turn_id ?? ""
  ) ? { turn_id: command.args.turn_id } : {} };
  const plainNotice = trialNotice && stdout.isTTY && stderr.isTTY && !command.values["no-input"] && command.values.format !== "json";
  await writeText(stderr, `${plainNotice ? message : JSON.stringify({ error: detail })}
`, "stderr");
  return code === "USAGE" ? 2 : 1;
}

// src/app.mjs
async function run(argv, context = {}) {
  const scope = runScope(context.signal, context.fetcher);
  context = { ...context, signal: scope.signal, fetcher: scope.fetcher };
  const env = context.env ?? process.env;
  const stdout = context.stdout ?? process.stdout;
  const stderr = context.stderr ?? process.stderr;
  const output = watchOutput(stdout, stderr, scope.close);
  let exitCode = 0;
  const directory = context.directory ?? join3(env.XDG_CONFIG_HOME || join3(homedir(), ".config"), "heari");
  let secret = env.HEARI_TOKEN;
  let locale = "zh-CN";
  let command;
  let browserAuth = false;
  const t = (zh, en) => pick(locale, zh, en);
  try {
    const parsed = await runProgram(argv, async (selected, _node, handler) => {
      command = selected;
      locale = command.locale;
      assertActive(scope.signal);
      if (command.name === "schema") {
        await writeResult(commandContract(command.values, locale), command.values, stdout, locale);
        return;
      }
      if (command.name === "auth status") {
        const status = await authStatus(command.values, env, directory, context, locale);
        assertActive(scope.signal);
        exitCode = status.passed ? 0 : 1;
        await writeResult(status, command.values, stdout, locale);
        return;
      }
      if (command.name === "doctor") {
        const report = await doctor(command.values, env, directory, context, locale);
        assertActive(scope.signal);
        exitCode = report.passed ? 0 : 1;
        await writeResult(report, command.values, stdout, locale);
        return;
      }
      let result;
      if (command.name === "skills install") {
        result = await installSkills(command.values, env, locale, scope.signal);
      } else if (command.name === "update") {
        result = await updateCli(command.values, context, stdout, stderr, locale);
      } else if (command.name === "logout") {
        await rm3(join3(directory, "credentials.json"), { force: true });
        result = { logged_out: true, note: t("\u672C\u673A\u51ED\u636E\u5DF2\u5220\u9664\u3002\u73AF\u5883\u4EE4\u724C\u4ECD\u6709\u6548\uFF1B\u5982\u9700\u64A4\u9500\u4EE4\u724C\uFF0C\u8BF7\u524D\u5F80\u5DE5\u4F5C\u53F0\u3002", "Local credentials removed. Environment tokens remain active; revoke tokens in the workbench if needed.") };
      } else {
        browserAuth = command.name === "login" && usesBrowserLogin(command.values, env, context);
        const credentials = await authenticate(command, env, directory, context, stderr, locale, browserAuth);
        secret = credentials.token;
        if (command.name !== "login") result = await execute(command, credentials, context, stderr, locale, handler);
        if (command.name === "login") {
          if (!browserAuth) await verifyAndSave(credentials, directory, context.fetcher, context.signal);
          result = { authenticated: true, endpoint: credentials.endpoint, next_step: t('heari research --goal "\u4F60\u7684\u7814\u7A76\u76EE\u6807"', 'heari research --goal "Your research goal"') };
        }
      }
      assertActive(scope.signal);
      await writeResult(result, command.values, stdout, locale);
    }, registerWorkflows);
    if (parsed.command.help || parsed.command.version) {
      command = parsed.command;
      locale = command.locale;
      assertActive(scope.signal);
      await writeText(stdout, command.help ? parsed.helpText : `${VERSION}
`);
    }
    await writeText(stdout, "");
    await writeText(stderr, "", "stderr");
    return exitCode;
  } catch (error) {
    const failure = output.failure ?? (error instanceof OutputWriteError ? error : scope.signal.aborted ? cancelledError() : error);
    if (failure instanceof OutputWriteError && failure.stream === "stdout" && failure.pipeClosed) return exitCode;
    const intended = failure instanceof Error && "code" in failure && failure.code === "USAGE" ? 2 : 1;
    try {
      return await writeFailure(failure, { command, locale, browserAuth, secret, stdout, stderr });
    } catch {
      return intended;
    }
  } finally {
    scope.close();
    output.close();
  }
}
export {
  run
};
