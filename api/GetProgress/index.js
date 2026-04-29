module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    // Mock data for now - will link to Cosmos DB later
    const progress = {
        az900: 15,
        ai900: 5,
        pl900: 0,
        nextStudySession: "Tomorrow @ 9:00 AM"
    };

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: progress
    };
}
