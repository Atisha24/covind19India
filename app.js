const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "covid19India.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServerQuery = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3002, () => {
      console.log("Server started at http://localhost:3002/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServerQuery();

const convertStateObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStateQuery = `
        SELECT *
        FROM state;`;
  const stateArray = await db.all(getStateQuery);
  response.send(
    stateArray.map((eachState) => convertStateObjectToResponseObject(eachState))
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesQuery = `
        SELECT *
        FROM state
        WHERE state_id = ${stateId};`;
  const statesArray = await db.get(getStatesQuery);
  response.send(convertStateObjectToResponseObject(statesArray));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `
        INSERT INTO
        district (district_name, state_id, cases, cured, active, deaths)
        VALUES (
            '${districtName}', ${stateId}, '${cases}', '${cured}', '${active}', '${deaths}'
        );`;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
        SELECT *
        FROM district 
        WHERE district_id = ${districtId};`;
  const districtDetails = await db.get(getDistrictQuery);
  response.send(convertDistrictObjectToResponseObject(districtDetails));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
        DELETE FROM
        district
        WHERE 
            district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateID, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
        UPDATE district
        SET 
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        WHERE 
            district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesStatsQuery = `
        SELECT 
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM district 
        WHERE 
            state_id = ${stateId};`;
  const districtStatsData = await db.get(getStatesStatsQuery);
  response.send({
    totalCases: districtStatsData["SUM(cases)"],
    totalCured: districtStatsData["SUM(cured)"],
    totalActive: districtStatsData["SUM(active)"],
    totalDeaths: districtStatsData["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
        SELECT state_name
        FROM district 
        NATURAL JOIN state
        WHERE 
            district_id = ${districtId};`;
  const state = await db.get(getStateNameQuery);
  response.send({
    stateName: state.state_name,
  });
});

module.exports = app;
