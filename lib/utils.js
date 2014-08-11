
function escapeJSONString (key, value) {
    if (typeof value === 'string') {
        return value.replace(/[^ -~\b\t\n\f\r"\\]/g, function (a) {
            return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        });
    }
    return value;
}

module.exports = {
    JSON: {
        parse: JSON.parse,
        stringify: function (data) {
            return JSON.stringify(data, escapeJSONString).replace(/\\\\u([\da-f]{4}?)/g, '\\u$1');
        }
    }
};
