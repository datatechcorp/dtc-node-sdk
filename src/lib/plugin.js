import DtcSdk from "index";
import utils from "utils";
import semver from "semver";

export default class Plugin {
    constructor(dtcSdk = false, options = {}) {
        if (!dtcSdk || !dtcSdk instanceof DtcSdk)
            throw new Error("Expected instance of DtcSdk");
        this.dtcSdk = dtcSdk;
        this.pluginNoOverride = ["register"];
        this.disablePlugins = options.disablePlugins;
    }

    register(Plugin, options) {
        let pluginInterface = {
            requires: "0.0.0",
            components: {},
        };
        let result = {
            libs: [],
            plugged: [],
            skipped: [],
        };
        if (this.disablePlugins) {
            result.error = "This instance of DtcSdk has plugins disabled.";
            return result;
        }
        const plugin = new Plugin(this.dtcSdk);
        if (utils.isFunction(plugin.pluginInterface)) {
            pluginInterface = plugin.pluginInterface(options);
        }
        if (semver.satisfies(DtcSdk.version, pluginInterface.requires)) {
            if (pluginInterface.fullClass) {
                // plug the entire class at the same level of dtcSdk.dtc
                let className = plugin.constructor.name;
                let classInstanceName =
                    className.substring(0, 1).toLowerCase() +
                    className.substring(1);
                if (className !== classInstanceName) {
                    DtcSdk[className] = Plugin;
                    this.dtcSdk[classInstanceName] = plugin;
                    result.libs.push(className);
                }
            } else {
                // plug methods into a class, like dtc
                for (let component in pluginInterface.components) {
                    if (!this.dtcSdk.hasOwnProperty(component)) {
                        continue;
                    }
                    let methods = pluginInterface.components[component];
                    let pluginNoOverride =
                        this.dtcSdk[component].pluginNoOverride || [];
                    for (let method in methods) {
                        if (
                            method === "constructor" ||
                            (this.dtcSdk[component][method] &&
                                (pluginNoOverride.includes(method) || // blacklisted methods
                                    /^_/.test(method))) // private methods
                        ) {
                            result.skipped.push(method);
                            continue;
                        }
                        this.dtcSdk[component][method] = methods[method].bind(
                            this.dtcSdk[component]
                        );
                        result.plugged.push(method);
                    }
                }
            }
        } else {
            throw new Error(
                "The plugin is not compatible with this version of DtcSdk"
            );
        }
        return result;
    }
}
