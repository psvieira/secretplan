
import PocketBase from 'pocketbase'

import type {
	TypedPocketBase,
	TypedPocketResponse,
	ProjectsRecord,
	ProjectsResponse,
	TasksRecord,
	TasksResponse,
	TeamsRecord,
	TeamsResponse,
	UsersResponse,
	InvitesResponse,
} from '@src/data/pocketbase-types'

type TexpandProject = {
	project?: ProjectsResponse
}

type TexpandMembers = {
	members: UsersResponse[]
}

type TexpandTeam ={
	teams: TeamsResponse
}

export const pb = new PocketBase(
	import.meta.env.POCKETBASE_URL || process.env.POCKETBASE_URL
	) as TypedPocketBase

// globally disable auto cancellaton
pb.autoCancellation(false)

function getStatus(project: ProjectsResponse) {
	switch (project.status) {
		case "not started":
			return 7;
		case "on hold":
			return 6;
		case "started":
			return 5;
		case "in progress":
			return 4;
		case "almost finished":
			return 3;
		case "ongoing":
			return 2;
		case "done":
			return 1;
		default:
			return 0;
	}
}

export async function getProjects({
	team_id,
}: {
	team_id?: string
}) {
	const options = { filter: 'team=""'}
	if (team_id) {
		options.filter = `team= "${team_id as string}"`
	}
	const projects = await pb
		.collection('projects')
		.getFullList(options)

	return projects.sort(
		(a,b) => getStatus(a) - getStatus(b))
}

export async function addProject(
	name: string,
	team_id?: string
	) {
	const newProject = await pb
		.collection('projects')
		.create({
			name,
			created_by: pb.authStore.model?.id,
			status: 'not started',
			team: team_id,
		})

	return newProject
}

export async function getProject(id: string) {
	const project = await pb.collection('projects').getOne(id)

	return project
}

export async function addTask(
	project_id: string,
	text: string) {
	const newTask = await pb.collection('tasks').create({
		project: project_id,
		created_by: pb.authStore.model?.id,
		text,
	})

	return newTask
}

export async function getTasks({
	project_id = null,
	done = false,
}): Promise<TasksResponse<TexpandProject>[]> {
	const options = { 
		filter:'',
		sort: '-starred_on, created',
	}

	let filter = `completed = ${done}`
	filter += ` && project = "${project_id}"`

	options.filter = filter
	
	let tasks: TasksResponse<TexpandProject>[] = []

	tasks = await pb
		.collection('tasks')
		.getFullList(options)

	return tasks
}

export async function deleteProject(id: string) {
	await pb.collection('projects').delete(id)
}

export async function updateProject(
	id: string,
	data: ProjectsRecord) {
	await pb.collection('projects').update(id, data)
}

export async function deleteTask(id: string) {
	await pb.collection('tasks').delete(id)
}

export async function updateTask(
	id: string,
	data: TasksRecord,
	) {
	await pb.collection('tasks').update(id, data)
}

export async function getStarredTasks({
	team_id = null,
}): Promise<TasksResponse<TexpandProject>[]> {
	const options = {
		sort: '-starred_on',
		filter: 'starred = true && completed = false',
		expand: 'project',
	}

	if (team_id) {
		options.filter += ` && project.team = "${team_id}"`
	} else {
		options.filter += ` && project.team = ""`
	}

	let tasks: TasksResponse<TexpandProject>[] = [] 
	tasks = await pb
		.collection('tasks')
		.getFullList(options)

	return tasks
}

export function processImages(task: TasksResponse) {
  type ImageItem = {
    name: string
    url: string
    url_larger: string
  }

  const images: ImageItem[] = []

  task.images?.map((image: string) => {
    images.push({
      name: image,
      url: pb.files.getUrl(task, image, {
        thumb: '0x200',
      }),
      url_larger: pb.files.getUrl(task, image, {
        thumb: '0x800',
      }),
    })
  })

  return images
}

export async function addTeam(name: string) {
  let team = await pb.collection('teams').create({
    name,
    created_by: pb.authStore.model?.id,
    status: 'inactive',
  })

  return team
}

export async function getTeam(id: string) {
  const team = await pb.collection('teams').getOne(id)

  return team
}

export async function userIsTeamOwner(team_id: string) {
  const team = await getTeam(team_id)
  if (team.created_by === pb.authStore.model?.id) {
    return true
  }
  return false
}

export async function getTeams() {
  const teams = await pb.collection('teams').getFullList()
  return teams
}

export async function deleteTeam(id: string) {
  return await pb.collection('teams').delete(id)
}

export async function updateTeam(
  id: string,
  data: TeamsRecord
) {
  await pb.collection('teams').update(id, data)
}

export async function getMembersOfTeam(team_id: string) {
  const team: TeamsResponse<TexpandMembers> = await pb
    .collection('teams')
    .getOne(team_id, {
      expand: 'members'
    })

  return team.expand?.members
}

export async function getOwnerOfTeam(team: TeamsResponse) {
  const user: UsersResponse = await pb
    .collection('users')
    .getOne(team.created_by)

  return user
}

export async function getInvitesForTeam(team_id: string) {
  const invites: InvitesResponse[] = await pb
    .collection('invites')
    .getFullList({
      filter: `team = "${team_id}"`
    })
  return invites
}

export async function addInvite(
  team_id: string,
  email: string
) {
  await pb.collection('invites').create({
    team: team_id,
    email,
  })
}

export async function getYourInvites() {
  const options = {
    filter: `email = "${pb.authStore.model?.email}"`,
    expand: 'team',
  }
  const invites: InvitesResponse<TexpandTeam>[] = await pb
    .collection('invites')
    .getFullList(options)

  return invites
}

export async function addMember(
  team_id: string,
  person_id: string
) {
  await pb.collection('teams').update(team_id, {
    'members+': person_id,
  })
}

export async function deleteInvite(id: string) {
  await pb.collection('invites').delete(id)
}

export async function getInvite(id: string) {
  const team: InvitesResponse = await pb
    .collection('invites')
    .getOne(id)

  return team
}

export async function getTask(id: string) {
  const options = {
    expand: 'project',
  }

  const task: TasksResponse<TexpandProject> = await pb
    .collection('tasks')
    .getOne(id, options)

  return task
}

