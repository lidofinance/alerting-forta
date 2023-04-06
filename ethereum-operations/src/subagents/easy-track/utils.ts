import {EASY_TRACK_TYPES_BY_FACTORIES} from "./constants";

export const getMotionType = (evmScriptFactory: string) => {
    return (
        EASY_TRACK_TYPES_BY_FACTORIES.get(evmScriptFactory.toLowerCase()) || "New "
    );
};

export const getMotionLink = (motionId: string) => {
    return `[${motionId}](https://easytrack.lido.fi/motions/${motionId})`;
};
