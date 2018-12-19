const key = "pitches";
//const key = "timbre";

function distance(sampleA, sampleB) {
    return Math.sqrt(
        sampleA[key]
            .map((e, i) => Math.pow(e - sampleB[key][i], 2))
            .reduce((acc, el) => acc + el, 0)
    );
}

module.exports = data => (({ matrix, largest }) =>
    matrix.map((row, y) => row.map((value, x) => value / largest)))(
    data.segments.reduce(
        (acc, el) =>
            (({ row, largest }) => ({
                matrix: [...acc.matrix, row],
                largest
            }))(
                data.segments.reduce(
                    (acc, e) =>
                        (distance => ({
                            row: [...acc.row, distance],
                            largest: distance > acc.largest ? distance : acc.largest
                        }))(distance(e, el)),
                    {
                        row: [],
                        largest: 0
                    }
                )
            ),
        { matrix: [], largest: 0 }
    )
)