/**
 * Minimal Illustrator DOM stub for TE.Doc tests.
 * Only the surface TE.Doc actually touches.
 */
function mockPathItem(opts) {
    return {
        guides: !!opts.guides,
        pathPoints: opts.points || [],
        layer: opts.layer || { name: "Layer 1", visible: true, locked: false },
        geometricBounds: opts.bounds || [0, 0, 0, 0],
        typename: "PathItem"
    };
}

function mockGuide(x1, y1, x2, y2, layer) {
    return mockPathItem({
        guides: true,
        layer: layer,
        points: [{ anchor: [x1, y1] }, { anchor: [x2, y2] }]
    });
}

function mockDoc(opts) {
    return {
        artboards: opts.artboards || [],
        pathItems: opts.pathItems || [],
        placedItems: opts.placedItems || [],
        layers: opts.layers || []
    };
}

module.exports = { mockPathItem: mockPathItem, mockGuide: mockGuide, mockDoc: mockDoc };
