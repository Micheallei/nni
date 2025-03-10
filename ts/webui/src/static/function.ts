import * as JSON5 from 'json5';
import axios from 'axios';
import { IContextualMenuProps } from '@fluentui/react';
import { MANAGER_IP } from './const';
import { EXPERIMENT } from './datamodel';
import { MetricDataRecord, FinalType, TableObj, Tensorboard } from './interface';

function getPrefix(): string | undefined {
    const pathName = window.location.pathname;
    let newPathName = pathName;
    const pathArr: string[] = ['/oview', '/detail', '/experiment'];
    pathArr.forEach(item => {
        if (pathName.endsWith(item)) {
            newPathName = pathName.replace(item, '');
        }
    });
    let result = newPathName === '' || newPathName === '/' ? undefined : newPathName;
    if (result !== undefined) {
        if (result.endsWith('/')) {
            result = result.slice(0, result.length - 1);
        }
    }
    return result;
}

async function requestAxios(url: string): Promise<any> {
    const response = await axios.get(url);
    if (response.status === 200) {
        if (response.data.error !== undefined) {
            throw new Error(`API ${url} ${response.data.error}`);
        } else {
            return response.data as any;
        }
    } else {
        throw new Error(`API ${url} ${response.status} error`);
    }
}

const convertTime = (num: number): string => {
    if (num <= 0) {
        return '0';
    }
    if (num % 3600 === 0) {
        return num / 3600 + 'h';
    } else {
        const hour = Math.floor(num / 3600);
        const min = Math.floor((num / 60) % 60);
        return hour > 0 ? `${hour}h ${min}min` : `${min}min`;
    }
};

// trial's duration, accurate to seconds for example 10min 30s
const convertDuration = (seconds: number): string => {
    let str = '';

    const d = Math.floor(seconds / (24 * 3600));
    if (d > 0) {
        str += `${d}d `;
    }
    seconds -= d * 24 * 3600;

    const h = Math.floor(seconds / 3600);
    if (h > 0) {
        str += `${h}h `;
    }
    seconds -= h * 3600;

    const m = Math.floor(seconds / 60);
    if (m > 0) {
        str += `${m}m `;
    }
    seconds -= m * 60;

    if (seconds > 0) {
        str += `${Math.floor(seconds)}s`;
    }
    return str ? str : '0s';
};

// according the unit(d,h,m) to convert duration
function convertTimeAsUnit(unit: string, value: number): number {
    let divisor = 1;
    if (unit === 'h') {
        divisor = 3600;
    } else if (unit === 'm') {
        divisor = 60;
    } else {
        divisor = 24 * 3600;
    }
    return value / divisor;
}
function parseMetrics(metricData: string): any {
    if (metricData.includes('NaN') || metricData.includes('Infinity')) {
        return JSON5.parse(JSON5.parse(metricData));
    } else {
        return JSON.parse(JSON.parse(metricData));
    }
}

const isArrayType = (list: any): boolean | undefined => {
    return Array.isArray(list);
};

// get final result value
// draw Accuracy point graph
const getFinalResult = (final?: MetricDataRecord[]): number => {
    let acc;
    let showDefault = 0;
    if (final) {
        acc = parseMetrics(final[final.length - 1].data);
        if (typeof acc === 'object' && !isArrayType(acc)) {
            if (acc.default) {
                showDefault = acc.default;
            }
        } else if (typeof acc === 'number') {
            showDefault = acc;
        } else {
            showDefault = NaN;
        }
        return showDefault;
    } else {
        return 0;
    }
};

function isNaNorInfinity(val: number): boolean {
    return Object.is(val, NaN) || Object.is(val, Infinity);
}

// get final result value // acc obj
const getFinal = (final?: MetricDataRecord[]): FinalType | undefined => {
    let showDefault: FinalType;
    if (final) {
        showDefault = parseMetrics(final[final.length - 1].data);
        if (typeof showDefault === 'number') {
            if (!isNaNorInfinity(showDefault)) {
                return { default: showDefault };
            }
        } else if (isArrayType(showDefault)) {
            // not support final type
            return undefined;
            // eslint-disable-next-line no-prototype-builtins
        } else if (typeof showDefault === 'object' && showDefault.hasOwnProperty('default')) {
            return showDefault;
        }
    } else {
        return undefined;
    }
};

// detail page table intermediate button
const intermediateGraphOption = (intermediateArr: number[], id: string): any => {
    const sequence: number[] = [];
    const lengthInter = intermediateArr.length;
    for (let i = 1; i <= lengthInter; i++) {
        sequence.push(i);
    }
    return {
        title: {
            text: id,
            left: 'center',
            textStyle: {
                fontSize: 16,
                color: '#333'
            }
        },
        tooltip: {
            trigger: 'item'
        },
        xAxis: {
            // name: '#Intermediate result',
            data: sequence
        },
        yAxis: {
            name: 'Default metric',
            type: 'value',
            data: intermediateArr,
            scale: true
        },
        series: [
            {
                symbolSize: 6,
                type: 'scatter',
                data: intermediateArr
            }
        ]
    };
};

// kill job
const killJob = (key: number, id: string, status: string, updateList?: Function): void => {
    axios(`${MANAGER_IP}/trial-jobs/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    })
        .then(res => {
            if (res.status === 200) {
                // TODO: use Message.txt to tooltip
                alert('Cancel the job successfully');
                // render the table
                if (updateList) {
                    updateList(); // FIXME
                }
            } else {
                alert('fail to cancel the job');
            }
        })
        .catch(error => {
            if (error.response.status === 500) {
                if (error.response.data.error) {
                    alert(error.response.data.error);
                } else {
                    alert('500 error, fail to cancel the job');
                }
            }
        });
};

// kill experiment
const killExperiment = (port: number): void => {
    axios(`${MANAGER_IP}/manage-experiment/${port.toString()}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    })
        .then(res => {
            if (res.status === 200) {
                // TODO: use Message.txt to tooltip
                alert('Cancel the job successfully');
            } else {
                alert('fail to cancel the job');
            }
        })
        .catch(error => {
            if (error.response.status === 500) {
                if (error.response.data.error) {
                    alert(error.response.data.error);
                } else {
                    alert('500 error, fail to cancel the job');
                }
            }
        });
};

const filterByStatus = (item: TableObj): boolean => {
    return item.status === 'SUCCEEDED';
};

// a waittiong trial may havn't start time
const filterDuration = (item: TableObj): boolean => {
    return item.status !== 'WAITING';
};

const downFile = (content: string, fileName: string): void => {
    const aTag = document.createElement('a');
    const isEdge = navigator.userAgent.indexOf('Edge') !== -1 ? true : false;
    const file = new Blob([content], { type: 'application/json' });
    aTag.download = fileName;
    aTag.href = URL.createObjectURL(file);
    aTag.click();
    if (!isEdge) {
        URL.revokeObjectURL(aTag.href);
    }
    if (navigator.userAgent.indexOf('Firefox') > -1) {
        const downTag = document.createElement('a');
        downTag.addEventListener('click', function () {
            downTag.download = fileName;
            downTag.href = URL.createObjectURL(file);
        });
        const eventMouse = document.createEvent('MouseEvents');
        eventMouse.initEvent('click', false, false);
        downTag.dispatchEvent(eventMouse);
    }
};

// function formatTimestamp(timestamp?: number, placeholder?: string = 'N/A'): string {
function formatTimestamp(timestamp?: number, placeholder?: string): string {
    if (placeholder === undefined) {
        placeholder = 'N/A';
    }
    return timestamp ? new Date(timestamp).toLocaleString('en-US') : placeholder;
}

function expformatTimestamp(timestamp: number | string): string {
    if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleString('en-US');
    } else {
        return 'N/A';
    }
}

function metricAccuracy(metric: MetricDataRecord): number {
    const data = parseMetrics(metric.data);
    // return typeof data === 'number' ? data : NaN;
    if (typeof data === 'number') {
        return data;
    } else {
        return data.default;
    }
}

function formatAccuracy(accuracy: number): string {
    // TODO: how to format NaN?
    return accuracy.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function formatComplexTypeValue(value: any): string | number {
    if (['number', 'string'].includes(typeof value)) {
        return value;
    } else {
        return value.toString();
    }
}

function isManagerExperimentPage(): boolean {
    return location.pathname.indexOf('experiment') === -1 ? false : true;
}

function caclMonacoEditorHeight(height): number {
    // [Search space 56px] + [marginBottom 18px] +
    // button[height: 32px, marginTop: 45px, marginBottom: 7px]
    // panel own padding-bottom: 20px;
    return height - 178;
}

function copyAndSort<T>(items: T[], columnKey: string, isSortedDescending?: boolean): any {
    const key = columnKey as keyof T;
    return items.slice(0).sort(function (a: T, b: T): any {
        if (
            a[key] === undefined ||
            Object.is(a[key], NaN) ||
            Object.is(a[key], Infinity) ||
            Object.is(a[key], -Infinity) ||
            typeof a[key] === 'object'
        ) {
            return 1;
        }
        if (
            b[key] === undefined ||
            Object.is(b[key], NaN) ||
            Object.is(b[key], Infinity) ||
            Object.is(b[key], -Infinity) ||
            typeof b[key] === 'object'
        ) {
            return -1;
        }
        return (isSortedDescending ? a[key] < b[key] : a[key] > b[key]) ? 1 : -1;
    });
}

function disableTensorboard(selectedRowIds: string[], queryTensorboardList: Tensorboard[]): boolean {
    let flag = true;

    if (selectedRowIds.length !== 0) {
        flag = false;
    }

    if (selectedRowIds.length === 0 && queryTensorboardList.length !== 0) {
        flag = false;
    }

    return flag;
}

function getTensorboardMenu(queryTensorboardList: Tensorboard[], stopFunc, seeDetailFunc): IContextualMenuProps {
    const result: Array<object> = [];
    if (queryTensorboardList.length !== 0) {
        result.push({
            key: 'delete',
            text: 'Stop all tensorBoard',
            className: 'clearAll',
            onClick: stopFunc
        });
        queryTensorboardList.forEach(item => {
            result.push({
                key: item.id,
                text: `${item.id}`,
                className: `CommandBarButton-${item.status}`,
                onClick: (): void => seeDetailFunc(item)
            });
        });
    }
    const tensorboardMenu: IContextualMenuProps = {
        items: result.reverse() as any
    };

    return tensorboardMenu;
}

// search space type map list: now get type from search space
const parametersType = (): Map<string, string> => {
    const parametersTypeMap = new Map();
    const trialParameterlist = Object.keys(EXPERIMENT.searchSpace);

    trialParameterlist.forEach(item => {
        parametersTypeMap.set(item, typeof EXPERIMENT.searchSpace[item]._value[0]);
    });

    return parametersTypeMap;
};

export {
    getPrefix,
    convertTime,
    convertDuration,
    convertTimeAsUnit,
    getFinalResult,
    getFinal,
    downFile,
    intermediateGraphOption,
    killJob,
    filterByStatus,
    filterDuration,
    formatAccuracy,
    formatTimestamp,
    expformatTimestamp,
    metricAccuracy,
    parseMetrics,
    isArrayType,
    requestAxios,
    isNaNorInfinity,
    formatComplexTypeValue,
    isManagerExperimentPage,
    caclMonacoEditorHeight,
    copyAndSort,
    disableTensorboard,
    getTensorboardMenu,
    parametersType,
    killExperiment
};
