import { sample } from "effector";
import { changeCode, loadedTutorialPage } from "../code/model";
import { notFoundRoute } from "../routing/routes/routes";
import { tutorialWithStageRoute } from "../routing/routes/tutorialRoute";
import { $completedTutorials, $tutorial, $tutorials, fetchAllTutorialsFx, fetchTutorialEvent, fetchTutorialFx, setCompletedTutorial } from "./model";
import { persist } from "effector-storage/local";

$tutorial.on(fetchTutorialFx.doneData, (_, tutorial) => tutorial);
$tutorials.on(fetchAllTutorialsFx.doneData, (_, tutorials) => tutorials);

persist({
  key: "completedTutorials",
  store: $completedTutorials,
})

sample({
  clock: [loadedTutorialPage, tutorialWithStageRoute.$params],
  source: tutorialWithStageRoute.$params,
  fn: (params) => params.stage,
  filter: (stage) => stage !== undefined,
  target: fetchTutorialFx,
});

sample({
  clock: loadedTutorialPage,
  target: fetchAllTutorialsFx,
});

sample({
  clock: fetchTutorialEvent,
  source: fetchTutorialEvent,
  fn: (tutorial) => tutorial.stage.toString(),
  target: fetchTutorialFx,
});

sample({
  clock: fetchTutorialFx.doneData,
  fn: (tutorial) => tutorial.contracts,
  target: changeCode,
});

sample({
  clock: fetchTutorialFx.failData,
  fn: () => notFoundRoute.open(),
});

sample({
  clock: setCompletedTutorial,
  fn: (stage) => {
    const completedTutorials = $completedTutorials.getState();
    if (!completedTutorials.includes(stage)) {
      return [...completedTutorials, stage];
    }
    return completedTutorials;
  },
  target: $completedTutorials
});